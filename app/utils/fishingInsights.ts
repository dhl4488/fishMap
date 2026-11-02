import type { FishingTrip } from '../composables/useFishingData'
import { isWithinMeasurementRange, measurementValueInMetric } from './tripInputValidation'

export interface SpeciesCatchTotal {
  species: string
  quantity: number
}

export interface PersonalBest {
  species: string
  location: string
  date: string
  value: number
  unit: 'cm' | 'kg'
}

export interface FishingInsights {
  totalCatches: number
  averageCatchesPerTrip: number
  speciesCount: number
  topSpecies: SpeciesCatchTotal[]
  bestTrip: { trip: FishingTrip; quantity: number } | null
  longestFish: PersonalBest | null
  heaviestFish: PersonalBest | null
}

export interface HourlyCatchTotal {
  hour: number
  quantity: number
}

export interface MonthlyCatchTrend {
  month: string
  quantity: number
  species: Map<string, number>
}

export interface SeasonalCatchTrend {
  season: string
  quantity: number
  topSpecies: SpeciesCatchTotal[]
}

function catchCount(trip: FishingTrip): number {
  return trip.catches.reduce((total, item) => total + item.quantity, 0)
}

function personalBest(
  trips: FishingTrip[],
  measurement: 'length' | 'weight',
  unit: PersonalBest['unit']
): PersonalBest | null {
  let best: PersonalBest | null = null
  for (const trip of trips) {
    for (const item of trip.catches) {
      const value = item[measurement]
      if (!value || !isWithinMeasurementRange(value, measurement)) continue
      const metricValue = measurementValueInMetric(value, measurement)
      if (metricValue === null || (best && metricValue <= best.value)) continue
      best = { species: item.species, location: trip.location, date: trip.date, value: metricValue, unit }
    }
  }
  return best
}

export function getFishingInsights(trips: FishingTrip[]): FishingInsights {
  const speciesTotals = new Map<string, number>()
  for (const trip of trips) {
    for (const item of trip.catches) {
      const species = item.species.trim()
      if (species) speciesTotals.set(species, (speciesTotals.get(species) ?? 0) + item.quantity)
    }
  }

  const totalCatches = trips.reduce((total, trip) => total + catchCount(trip), 0)
  const bestTrip = trips.reduce<FishingInsights['bestTrip']>((best, trip) => {
    const quantity = catchCount(trip)
    return quantity > (best?.quantity ?? 0) ? { trip, quantity } : best
  }, null)

  return {
    totalCatches,
    averageCatchesPerTrip: trips.length ? totalCatches / trips.length : 0,
    speciesCount: speciesTotals.size,
    topSpecies: [...speciesTotals].map(([species, quantity]) => ({ species, quantity }))
      .sort((a, b) => b.quantity - a.quantity || a.species.localeCompare(b.species))
      .slice(0, 5),
    bestTrip,
    longestFish: personalBest(trips, 'length', 'cm'),
    heaviestFish: personalBest(trips, 'weight', 'kg')
  }
}

export function getSeasonalCatchTrends(trips: FishingTrip[], year: string): {
  months: MonthlyCatchTrend[]
  seasons: SeasonalCatchTrend[]
} {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months = monthNames.map(month => ({ month, quantity: 0, species: new Map<string, number>() }))
  for (const trip of trips) {
    if (!trip.date.startsWith(year)) continue
    const monthIndex = Number(trip.date.slice(5, 7)) - 1
    const month = months[monthIndex]
    if (!month) continue
    for (const item of trip.catches) {
      month.quantity += item.quantity
      if (item.species.trim()) {
        month.species.set(item.species, (month.species.get(item.species) ?? 0) + item.quantity)
      }
    }
  }

  const seasonMonths = [
    { season: 'Winter', months: [11, 0, 1] },
    { season: 'Spring', months: [2, 3, 4] },
    { season: 'Summer', months: [5, 6, 7] },
    { season: 'Fall', months: [8, 9, 10] }
  ]
  const seasons = seasonMonths.map(({ season, months: indexes }) => {
    const totals = new Map<string, number>()
    for (const index of indexes) {
      const month = months[index]
      if (!month) continue
      for (const [species, quantity] of month.species) {
        totals.set(species, (totals.get(species) ?? 0) + quantity)
      }
    }
    return {
      season,
      quantity: indexes.reduce((total, index) => total + (months[index]?.quantity ?? 0), 0),
      topSpecies: [...totals].map(([species, quantity]) => ({ species, quantity }))
        .sort((a, b) => b.quantity - a.quantity || a.species.localeCompare(b.species))
        .slice(0, 3)
    }
  })

  return { months, seasons }
}

export function getHourlyCatchTotals(trips: FishingTrip[]): HourlyCatchTotal[] {
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, quantity: 0 }))
  for (const trip of trips) {
    for (const item of trip.catches) {
      if (!item.time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) continue
      const hour = Number(item.time.slice(0, 2))
      const total = hours[hour]
      if (total) total.quantity += item.quantity
    }
  }
  return hours
}

export function formatCatchTime(value: string): string {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) return value
  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}
