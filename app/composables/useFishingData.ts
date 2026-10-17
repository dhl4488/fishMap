export interface FishingCatch {
  species: string
  quantity: number
}

export interface FishingTrip {
  id: string
  date: string
  location: string
  catches: FishingCatch[]
  conditions: string
  notes: string
}

export interface FishingSpot {
  id: string
  name: string
  water: string
  kind: string
  latitude: number
  longitude: number
  notes: string
}

const storageKey = 'tidelog-data-v1'

// Starter entries give a first-time visit something to explore.
const starterTrips: FishingTrip[] = [
  {
    id: 'trip-willow',
    date: '2026-10-11',
    location: 'Willow Creek',
    catches: [{ species: 'Rainbow trout', quantity: 3 }, { species: 'Brown trout', quantity: 1 }],
    conditions: 'Cloudy · 58°F',
    notes: 'A quiet morning on the upper bend. The trout were rising just after sunrise; a little patience and a dry fly did the trick.'
  },
  {
    id: 'trip-lake',
    date: '2026-10-04',
    location: 'Pine Lake',
    catches: [{ species: 'Largemouth bass', quantity: 2 }],
    conditions: 'Clear · 64°F',
    notes: 'Worked the shaded edge near the reeds. One good-sized bass just before lunch.'
  },
  {
    id: 'trip-river',
    date: '2026-09-27',
    location: 'North Fork',
    catches: [{ species: 'Smallmouth bass', quantity: 2 }, { species: 'Bluegill', quantity: 2 }],
    conditions: 'Breezy · 61°F',
    notes: 'Took the long way down to the river and found a lovely stretch of water to myself.'
  }
]

const starterSpots: FishingSpot[] = [
  {
    id: 'spot-willow',
    name: 'Willow Creek Bend',
    water: 'Willow Creek',
    kind: 'Freshwater · River',
    latitude: 44.0521,
    longitude: -123.0868,
    notes: 'Best at first light. Try the upper bend when the water is running clear.'
  },
  {
    id: 'spot-pine',
    name: 'Pine Lake Reeds',
    water: 'Pine Lake',
    kind: 'Freshwater · Lake',
    latitude: 44.0618,
    longitude: -123.102,
    notes: 'A sheltered spot along the eastern edge. Reeds make a great bass hideout.'
  },
  {
    id: 'spot-north',
    name: 'North Fork Crossing',
    water: 'North Fork',
    kind: 'Freshwater · River',
    latitude: 44.0447,
    longitude: -123.0749,
    notes: 'Rocky bottom with a deeper pool just downstream of the crossing.'
  }
]

interface SavedData {
  trips: FishingTrip[]
  spots: FishingSpot[]
}

function isFishingCatch(value: unknown): value is FishingCatch {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return typeof item.species === 'string' && typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0
}

function isFishingTrip(value: unknown): value is FishingTrip {
  if (typeof value !== 'object' || value === null) return false
  const trip = value as Record<string, unknown>
  return typeof trip.id === 'string' &&
    typeof trip.date === 'string' &&
    typeof trip.location === 'string' &&
    Array.isArray(trip.catches) &&
    trip.catches.every(isFishingCatch) &&
    typeof trip.conditions === 'string' &&
    typeof trip.notes === 'string'
}

function isFishingSpot(value: unknown): value is FishingSpot {
  if (typeof value !== 'object' || value === null) return false
  const spot = value as Record<string, unknown>
  return typeof spot.id === 'string' &&
    typeof spot.name === 'string' &&
    typeof spot.water === 'string' &&
    typeof spot.kind === 'string' &&
    typeof spot.latitude === 'number' && Number.isFinite(spot.latitude) && spot.latitude >= -90 && spot.latitude <= 90 &&
    typeof spot.longitude === 'number' && Number.isFinite(spot.longitude) && spot.longitude >= -180 && spot.longitude <= 180 &&
    typeof spot.notes === 'string'
}

export function useFishingData() {
  const data = useState<SavedData>('fishing-data', () => ({
    trips: starterTrips.map(trip => ({ ...trip, catches: trip.catches.map(item => ({ ...item })) })),
    spots: starterSpots.map(spot => ({ ...spot }))
  }))
  const isLoaded = useState('fishing-data-loaded', () => false)

  if (import.meta.client) {
    // Read browser storage after hydration so the server and first client render match.
    onMounted(() => {
      if (isLoaded.value) return
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed: unknown = JSON.parse(saved)
          // Browser storage can be edited externally, so validate it before trusting its shape.
          if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'trips' in parsed &&
            Array.isArray(parsed.trips) &&
            parsed.trips.every(isFishingTrip) &&
            'spots' in parsed &&
            Array.isArray(parsed.spots) &&
            parsed.spots.every(isFishingSpot)
          ) {
            data.value = parsed as SavedData
          } else {
            console.error('Saved Tidelog data has an invalid format; using starter entries instead.')
          }
        }
      } catch (error) {
        console.error('Could not read saved Tidelog data; using starter entries instead.', error)
      }
      isLoaded.value = true
    })
  }

  function persist() {
    if (!import.meta.client) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(data.value))
    } catch (error) {
      console.error('Could not save Tidelog data to this browser.', error)
    }
  }

  function addTrip(trip: Omit<FishingTrip, 'id'>) {
    data.value.trips.unshift({ ...trip, id: `trip-${Date.now()}` })
    persist()
  }

  function addSpot(spot: Omit<FishingSpot, 'id'>) {
    data.value.spots.unshift({ ...spot, id: `spot-${Date.now()}` })
    persist()
  }

  return { data, addTrip, addSpot }
}
