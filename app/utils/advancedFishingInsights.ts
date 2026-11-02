import type { FishingTrip } from '../composables/useFishingData'
import * as SunCalc from 'suncalc'
import tzLookup from 'tz-lookup'

export const MIN_SPOT_RATE_TRIPS = 3
export const MIN_CONDITION_TRIPS = 6
export const MIN_CONDITION_GROUP_TRIPS = 3
export const MIN_SUN_TIMED_FISH = 10
export const MIN_SUN_TRIPS = 5

export interface SpotCatchRate {
  key: string
  location: string
  catches: number
  hours: number
  trips: number
  rate: number
}

export interface SpotConditionInsight {
  location: string
  condition: string
  rate: number
  sampleSize: number
  comparisonRate: number
  comparisonSampleSize: number
}

export interface SunTimingInsight {
  timedFish: number
  trips: number
  withinSunWindow: number
  percentWithinSunWindow: number
  averageSunAltitude: number
  nearestEvent: 'sunrise' | 'sunset'
  averageMinutesFromEvent: number
}

function spotKey(trip: FishingTrip): string {
  return `${trip.location.trim().toLocaleLowerCase()}|${(trip.spotWater ?? '').trim().toLocaleLowerCase()}`
}

function validDuration(trip: FishingTrip): trip is FishingTrip & { hoursFished: number } {
  return typeof trip.hoursFished === 'number' && Number.isFinite(trip.hoursFished) &&
    trip.hoursFished >= 0.25 && trip.hoursFished <= 24
}

export function getSpotCatchRates(trips: FishingTrip[]): SpotCatchRate[] {
  const grouped = new Map<string, SpotCatchRate>()
  for (const trip of trips) {
    if (!trip.location.trim() || !validDuration(trip)) continue
    const key = spotKey(trip)
    const summary = grouped.get(key) ?? {
      key,
      location: trip.location.trim(),
      catches: 0,
      hours: 0,
      trips: 0,
      rate: 0
    }
    summary.catches += trip.catches.reduce((total, item) => total + item.quantity, 0)
    summary.hours += trip.hoursFished
    summary.trips += 1
    grouped.set(key, summary)
  }
  return [...grouped.values()]
    .filter(item => item.trips >= MIN_SPOT_RATE_TRIPS)
    .map(item => ({ ...item, rate: item.catches / item.hours }))
    .sort((a, b) => b.rate - a.rate || b.trips - a.trips)
}

function numericCondition(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined
  const lower = Math.floor(parsed / 5) * 5
  return `${lower}–${lower + 4}°C`
}

function conditionsFor(trip: FishingTrip): Array<{ name: string; value: string }> {
  const conditions: Array<{ name: string; value: string }> = []
  if (trip.windDirection) conditions.push({ name: 'wind', value: `${trip.windDirection} wind` })
  const temperature = numericCondition(trip.airTemperature)
  if (temperature) conditions.push({ name: 'air temperature', value: temperature })
  if (trip.cloudCover) conditions.push({ name: 'cloud cover', value: trip.cloudCover })
  if (trip.precipitation) conditions.push({ name: 'precipitation', value: trip.precipitation })
  return conditions
}

export function getSpotConditionInsights(trips: FishingTrip[]): SpotConditionInsight[] {
  const bySpot = new Map<string, FishingTrip[]>()
  for (const trip of trips) {
    if (!trip.location.trim() || !validDuration(trip)) continue
    const key = spotKey(trip)
    const spotTrips = bySpot.get(key) ?? []
    spotTrips.push(trip)
    bySpot.set(key, spotTrips)
  }

  const insights: SpotConditionInsight[] = []
  for (const spotTrips of bySpot.values()) {
    if (spotTrips.length < MIN_CONDITION_TRIPS) continue
    const location = spotTrips[0]?.location.trim()
    if (!location) continue
    const byCondition = new Map<string, { label: string; catches: number; hours: number; trips: number }>()
    for (const trip of spotTrips) {
      const catchCount = trip.catches.reduce((total, item) => total + item.quantity, 0)
      for (const { name, value } of conditionsFor(trip)) {
        const key = `${name}:${value}`
        const group = byCondition.get(key) ?? { label: `${value} · ${name}`, catches: 0, hours: 0, trips: 0 }
        group.catches += catchCount
        group.hours += trip.hoursFished
        group.trips += 1
        byCondition.set(key, group)
      }
    }

    for (const group of byCondition.values()) {
      if (group.trips < MIN_CONDITION_GROUP_TRIPS) continue
      const comparison = spotTrips.filter((trip) => {
        const values = conditionsFor(trip)
        return !values.some(({ name, value }) => group.label === `${value} · ${name}`)
      })
      if (comparison.length < MIN_CONDITION_GROUP_TRIPS) continue
      const comparisonHours = comparison.reduce((total, trip) => total + trip.hoursFished, 0)
      if (!comparisonHours) continue
      insights.push({
        location,
        condition: group.label,
        rate: group.catches / group.hours,
        sampleSize: group.trips,
        comparisonRate: comparison.reduce(
          (total, trip) => total + trip.catches.reduce((sum, item) => sum + item.quantity, 0),
          0
        ) / comparisonHours,
        comparisonSampleSize: comparison.length
      })
    }
  }

  return insights
    .filter(insight => insight.rate > insight.comparisonRate)
    .sort((a, b) => (b.rate - b.comparisonRate) - (a.rate - a.comparisonRate))
    .slice(0, 5)
}

function localDateTimeAsUtc(date: string, time: string, zone: string): Date | null {
  const dateParts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const timeParts = time.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!dateParts || !timeParts) return null
  const [year, month, day] = dateParts.slice(1).map(Number)
  const target = Date.UTC(year!, month! - 1, day!, Number(timeParts[1]), Number(timeParts[2]))
  const calendarDate = new Date(Date.UTC(year!, month! - 1, day!))
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month! - 1 || calendarDate.getUTCDate() !== day) return null
  let timestamp = target
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]))
    const represented = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!)
    const adjustment = target - represented
    timestamp += adjustment
    if (!adjustment) break
  }
  const result = new Date(timestamp)
  if (Number.isNaN(result.getTime())) return null
  const resolved = Object.fromEntries(formatter.formatToParts(result)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]))
  return resolved.year === year && resolved.month === month && resolved.day === day &&
    resolved.hour === Number(timeParts[1]) && resolved.minute === Number(timeParts[2])
    ? result
    : null
}

function zoneOffsetMinutes(instant: Date, zone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(instant)
    .filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]))
  const represented = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!)
  return (represented - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000
}

export function getSunTimingInsight(trips: FishingTrip[]): {
  insight: SunTimingInsight | null
  timedFish: number
  trips: number
} {
  let withinSunWindow = 0
  let altitudeTotal = 0
  let validFish = 0
  let sunriseFish = 0
  let sunriseOffsetTotal = 0
  let sunsetFish = 0
  let sunsetOffsetTotal = 0
  const contributingTrips = new Set<string>()

  for (const trip of trips) {
    if (trip.latitude === undefined || trip.longitude === undefined) continue
    for (const item of trip.catches) {
      if (!item.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) continue
      let zone: string
      let catchInstant: Date | null
      try {
        zone = tzLookup(trip.latitude, trip.longitude)
        catchInstant = localDateTimeAsUtc(trip.date, item.time, zone)
      } catch (error) {
        console.error('Could not resolve local solar time for a timed catch.', error)
        continue
      }
      if (!catchInstant) continue
      const times = SunCalc.getTimes(
        catchInstant,
        trip.latitude,
        trip.longitude,
        0,
        zoneOffsetMinutes(catchInstant, zone)
      )
      const events = [
        { name: 'sunrise' as const, time: times.sunrise },
        { name: 'sunset' as const, time: times.sunset }
      ].filter((event): event is { name: 'sunrise' | 'sunset'; time: Date } =>
        event.time instanceof Date && Number.isFinite(event.time.getTime())
      )
      if (!events.length) continue
      const nearestEvent = events.reduce((nearest, event) =>
        Math.abs(catchInstant!.getTime() - event.time.getTime()) <
          Math.abs(catchInstant!.getTime() - nearest.time.getTime()) ? event : nearest
      )
      const signedMinutes = (catchInstant.getTime() - nearestEvent.time.getTime()) / 60_000
      const nearestMinutes = Math.abs(signedMinutes)
      if (nearestMinutes <= 90) withinSunWindow += item.quantity
      if (nearestEvent.name === 'sunrise') {
        sunriseFish += item.quantity
        sunriseOffsetTotal += signedMinutes * item.quantity
      } else {
        sunsetFish += item.quantity
        sunsetOffsetTotal += signedMinutes * item.quantity
      }
      altitudeTotal += SunCalc.getPosition(catchInstant, trip.latitude, trip.longitude).altitude * item.quantity
      validFish += item.quantity
      contributingTrips.add(trip.id)
    }
  }

  const enoughData = validFish >= MIN_SUN_TIMED_FISH && contributingTrips.size >= MIN_SUN_TRIPS
  return {
    timedFish: validFish,
    trips: contributingTrips.size,
    insight: enoughData
      ? {
          timedFish: validFish,
          trips: contributingTrips.size,
          withinSunWindow,
          percentWithinSunWindow: Math.round(withinSunWindow / validFish * 100),
          averageSunAltitude: altitudeTotal / validFish,
          nearestEvent: sunriseFish >= sunsetFish ? 'sunrise' : 'sunset',
          averageMinutesFromEvent: sunriseFish >= sunsetFish
            ? sunriseOffsetTotal / sunriseFish
            : sunsetOffsetTotal / sunsetFish
        }
      : null
  }
}

export function distanceBetweenKm(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const haversine = Math.min(1, Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2)
  return 6_371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}
