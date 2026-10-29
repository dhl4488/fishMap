import type { FishingSpot } from '../composables/useFishingData'

interface WeatherConditions {
  airTemperature?: string
  windSpeed?: string
  windDirection?: string
  cloudCover?: string
  precipitation?: string
  resolvedLocation: string
}

interface Coordinates {
  latitude: number
  longitude: number
  name: string
}

const dailyVariables = [
  'temperature_2m_mean',
  'wind_speed_10m_max',
  'wind_direction_10m_dominant',
  'cloud_cover_mean',
  'precipitation_sum',
  'weather_code'
].join(',')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getCoordinates(location: string, spots: FishingSpot[]): Coordinates | null {
  const normalizedLocation = location.trim().toLocaleLowerCase()
  const savedSpot = spots.find(spot => spot.name.trim().toLocaleLowerCase() === normalizedLocation)
  if (savedSpot) {
    return {
      latitude: savedSpot.latitude,
      longitude: savedSpot.longitude,
      name: savedSpot.name
    }
  }
  return null
}

async function geocodeLocation(location: string): Promise<Coordinates> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({
    name: location,
    count: '1',
    language: 'en',
    format: 'json'
  }).toString()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Location search failed (HTTP ${response.status}).`)

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.results) || !isRecord(payload.results[0])) {
    throw new Error('Could not find that location. Try a nearby town or select a saved fishing spot.')
  }

  const result = payload.results[0]
  if (typeof result.name !== 'string' ||
      typeof result.latitude !== 'number' ||
      typeof result.longitude !== 'number' ||
      !Number.isFinite(result.latitude) ||
      !Number.isFinite(result.longitude)) {
    throw new Error('The location search returned incomplete coordinates.')
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: [result.name, result.admin1, result.country]
      .filter((part): part is string => typeof part === 'string' && part.length > 0)
      .join(', ')
  }
}

function getWeatherEndpoint(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const tripDay = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const daysFromToday = Math.round((tripDay - today) / 86_400_000)

  if (daysFromToday > 16) {
    throw new Error('Weather forecasts are available up to 16 days ahead.')
  }
  return daysFromToday >= -90
    ? 'https://api.open-meteo.com/v1/forecast'
    : 'https://archive-api.open-meteo.com/v1/archive'
}

function compassDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return directions[Math.round((((degrees % 360) + 360) % 360) / 45) % directions.length]
}

function cloudDescription(percentage: number): string {
  if (percentage < 20) return 'Clear'
  if (percentage < 50) return 'Partly cloudy'
  if (percentage < 80) return 'Mostly cloudy'
  return 'Overcast'
}

function precipitationDescription(weatherCode: number | null, precipitation: number | null): string | undefined {
  if (precipitation === null) return undefined
  if (precipitation <= 0) return 'None'
  if (weatherCode === null) return 'Rain'
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return 'Drizzle'
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'Snow'
  if ([95, 96, 99].includes(weatherCode)) return 'Mixed'
  return 'Rain'
}

export async function fetchTripWeather(
  date: string,
  location: string,
  spots: FishingSpot[]
): Promise<WeatherConditions> {
  const coordinates = getCoordinates(location, spots) ?? await geocodeLocation(location.trim())
  const url = new URL(getWeatherEndpoint(date))
  url.search = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
    start_date: date,
    end_date: date,
    daily: dailyVariables,
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto'
  }).toString()

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Weather lookup failed (HTTP ${response.status}).`)
  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.daily)) {
    throw new Error('Weather data was unavailable for this date and location.')
  }

  const daily = payload.daily
  if (!Array.isArray(daily.time) || daily.time[0] !== date) {
    throw new Error('No weather data was returned for the selected date.')
  }
  const getNumber = (key: string) => {
    const values = daily[key]
    const value = Array.isArray(values) ? values[0] : undefined
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }

  const temperature = getNumber('temperature_2m_mean')
  const windSpeed = getNumber('wind_speed_10m_max')
  const windDirection = getNumber('wind_direction_10m_dominant')
  const cloudCover = getNumber('cloud_cover_mean')
  const precipitation = getNumber('precipitation_sum')
  const weatherCode = getNumber('weather_code')
  const weather: WeatherConditions = { resolvedLocation: coordinates.name }

  if (temperature !== null) weather.airTemperature = temperature.toFixed(1)
  if (windSpeed !== null) weather.windSpeed = windSpeed.toFixed(1)
  if (windDirection !== null) weather.windDirection = compassDirection(windDirection)
  if (cloudCover !== null) weather.cloudCover = cloudDescription(cloudCover)
  weather.precipitation = precipitationDescription(weatherCode, precipitation)

  if (!weather.airTemperature && !weather.windSpeed && !weather.windDirection &&
      !weather.cloudCover && !weather.precipitation) {
    throw new Error('Weather data for this date is not available yet.')
  }
  return weather
}
