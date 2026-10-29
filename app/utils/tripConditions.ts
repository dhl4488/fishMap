export interface TripConditions {
  conditions?: string
  airTemperature?: string
  waterTemperature?: string
  windSpeed?: string
  windDirection?: string
  cloudCover?: string
  precipitation?: string
}

export function formatTripConditions(trip: TripConditions) {
  return [
    trip.conditions,
    trip.airTemperature && `Air ${trip.airTemperature} °C`,
    trip.waterTemperature && `Water ${trip.waterTemperature} °C`,
    (trip.windSpeed || trip.windDirection) &&
      `Wind ${[trip.windSpeed && `${trip.windSpeed} km/h`, trip.windDirection].filter(Boolean).join(' ')}`,
    trip.cloudCover,
    trip.precipitation
  ].filter(Boolean).join(' · ')
}
