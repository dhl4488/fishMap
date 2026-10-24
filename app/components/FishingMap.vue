<script setup lang="ts">
import type * as Leaflet from 'leaflet'
import type { FishingSpot } from '../composables/useFishingData'

const props = defineProps<{
  spots: FishingSpot[]
  selectedSpotId?: string
  pickMode?: boolean
  pickedLocation?: { latitude: number; longitude: number } | null
}>()

const emit = defineEmits<{
  select: [spotId: string]
  pick: [coordinates: { latitude: number; longitude: number }]
}>()

const mapElement = ref<HTMLDivElement | null>(null)
const addressQuery = ref('')
const searchResults = ref<GeocodingResult[]>([])
const searchError = ref('')
const searching = ref(false)
let map: Leaflet.Map | null = null
let leaflet: typeof Leaflet | null = null
const spotMarkers = new Map<string, Leaflet.Marker>()
let pickedMarker: Leaflet.Marker | null = null
let searchController: AbortController | null = null

interface GeocodingResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

// Builds the map marker for a spot; accepts its selected state and returns a Leaflet icon.
function markerIcon(isSelected = false): Leaflet.DivIcon {
  if (!leaflet) throw new Error('Map library has not been initialized.')
  return leaflet.divIcon({
    className: 'tidelog-map-marker',
    html: `<span class="tidelog-map-marker-pin${isSelected ? ' is-selected' : ''}"><i></i></span>`,
    iconSize: [26, 34],
    iconAnchor: [13, 32]
  })
}

// Recreates markers for the current saved spots; takes no input and synchronizes markers with component props.
function renderSpots() {
  if (!map || !leaflet) return

  for (const marker of spotMarkers.values()) marker.remove()
  spotMarkers.clear()

  for (const spot of props.spots) {
    const isSelected = spot.id === props.selectedSpotId
    const marker = leaflet.marker([spot.latitude, spot.longitude], {
      icon: markerIcon(isSelected),
      title: spot.name,
      alt: spot.name
    })
      .addTo(map)
      .bindTooltip(spot.name)
      .on('click', () => emit('select', spot.id))
    spotMarkers.set(spot.id, marker)
  }
}

// Adds, moves, or removes the in-progress location marker; takes no input and synchronizes it with the picked location.
function renderPickedLocation() {
  if (!map || !props.pickedLocation) {
    pickedMarker?.remove()
    pickedMarker = null
    return
  }

  const position: Leaflet.LatLngExpression = [props.pickedLocation.latitude, props.pickedLocation.longitude]
  if (pickedMarker) {
    pickedMarker.setLatLng(position)
  } else if (leaflet) {
    pickedMarker = leaflet.marker(position, { icon: markerIcon(true), keyboard: false }).addTo(map)
  }
}

// Searches OpenStreetMap for the entered address; takes no input and updates results or search error state.
async function searchAddress() {
  const query = addressQuery.value.trim()
  if (!query || searching.value || !map) return

  searchController?.abort()
  searchController = new AbortController()
  searching.value = true
  searchError.value = ''
  searchResults.value = []

  try {
    const parameters = new URLSearchParams({
      format: 'jsonv2',
      limit: '5',
      q: query
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${parameters}`, {
      signal: searchController.signal,
      headers: { 'Accept-Language': 'en' }
    })
    if (!response.ok) throw new Error(`Address search failed (${response.status}).`)

    const results: unknown = await response.json()
    if (!Array.isArray(results)) throw new Error('Address search returned an unexpected response.')
    searchResults.value = results.filter((result): result is GeocodingResult =>
      typeof result === 'object' &&
      result !== null &&
      'place_id' in result && typeof result.place_id === 'number' &&
      'display_name' in result && typeof result.display_name === 'string' &&
      'lat' in result && typeof result.lat === 'string' &&
      'lon' in result && typeof result.lon === 'string' &&
      Number.isFinite(Number(result.lat)) &&
      Number.isFinite(Number(result.lon))
    )
    if (!searchResults.value.length) searchError.value = 'No matching addresses found. Try a town, region, or country.'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    console.error('Could not search for this map address.', error)
    searchError.value = 'Address search is unavailable right now. Please try again.'
  } finally {
    searching.value = false
  }
}

// Moves the map to a geocoding result; accepts a result and updates map position and search state.
function goToResult(result: GeocodingResult) {
  if (!map) return
  const latitude = Number(result.lat)
  const longitude = Number(result.lon)
  map.flyTo([latitude, longitude], 14, { duration: 0.7 })
  addressQuery.value = result.display_name
  searchResults.value = []
  searchError.value = ''
}

onMounted(async () => {
  if (!mapElement.value) return
  const L = await import('leaflet')
  leaflet = L

  const center: Leaflet.LatLngExpression = [44.608, -79.42]
  map = L.map(mapElement.value, {
    center,
    zoom: 7,
    scrollWheelZoom: true
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  map.on('click', (event: Leaflet.LeafletMouseEvent) => {
    if (!props.pickMode) return
    emit('pick', { latitude: event.latlng.lat, longitude: event.latlng.lng })
  })

  renderSpots()
  renderPickedLocation()
})

watch(() => props.spots, renderSpots, { deep: true })
watch(() => props.selectedSpotId, (spotId) => {
  renderSpots()
  const spot = props.spots.find(item => item.id === spotId)
  if (map && spot) map.flyTo([spot.latitude, spot.longitude], Math.max(map.getZoom(), 11), { duration: 0.5 })
})
watch(() => props.pickedLocation, renderPickedLocation, { deep: true })
watch(() => props.pickMode, (pickMode) => {
  if (map) map.getContainer().classList.toggle('tidelog-map-pick-mode', Boolean(pickMode))
})

onBeforeUnmount(() => {
  searchController?.abort()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="fishing-map-frame">
    <div ref="mapElement" class="fishing-map" :class="{ 'fishing-map-picking': pickMode }" />
    <form class="map-search" role="search" @submit.prevent="searchAddress">
      <div class="map-search-input">
        <span class="map-search-icon" aria-hidden="true">⌕</span>
        <input
          v-model="addressQuery"
          type="search"
          aria-label="Search an address or place"
          placeholder="Search places"
          maxlength="180"
          @input="searchResults = []; searchError = ''"
        >
        <button type="submit" :disabled="searching || !addressQuery.trim()" aria-label="Search map">
          {{ searching ? '…' : 'Search' }}
        </button>
      </div>
      <ul v-if="searchResults.length" class="map-search-results">
        <li v-for="result in searchResults" :key="result.place_id">
          <button type="button" @click="goToResult(result)">{{ result.display_name }}</button>
        </li>
        <li class="map-search-attribution">Search results © OpenStreetMap contributors</li>
      </ul>
      <p v-else-if="searchError" class="map-search-message" role="status">{{ searchError }}</p>
    </form>
  </div>
</template>

<style>
@import 'leaflet/dist/leaflet.css';

.fishing-map-frame { height: 100%; min-height: 370px; position: relative; width: 100%; }
.fishing-map { background: #e5eee9; height: 100%; min-height: 370px; width: 100%; }
.fishing-map .leaflet-container { background: #e5eee9; font-family: 'DM Sans', sans-serif; height: 100%; width: 100%; }
.tidelog-map-marker { background: transparent; border: 0; }
.tidelog-map-marker-pin { align-items: center; background: #316b53; border: 2px solid white; border-radius: 50% 50% 50% 0; box-shadow: 0 2px 6px #20382c66; display: flex; height: 22px; justify-content: center; transform: rotate(-45deg); width: 22px; }
.tidelog-map-marker-pin i { background: white; border-radius: 50%; height: 6px; width: 6px; }
.tidelog-map-marker-pin.is-selected { background: #d38b57; }
.fishing-map-picking .leaflet-container { cursor: crosshair; }
.fishing-map .leaflet-control-attribution { font-size: 12px; }
.map-search { max-width: min(430px, calc(100% - 64px)); position: absolute; right: 12px; top: 12px; z-index: 1100; }
.map-search-input { align-items: center; background: white; border: 1px solid #e5eae4; border-radius: 9px; box-shadow: 0 2px 10px #1d33271c; display: flex; gap: 8px; padding: 4px 5px 4px 11px; }
.map-search-icon { color: #78867e; font-size: 18px; line-height: 1; }
.map-search-input input { background: transparent; border: 0; color: #34433a; flex: 1 1 auto; font: inherit; font-size: 12px; min-width: 0; outline: 0; overflow: hidden; padding: 7px 0; text-overflow: ellipsis; white-space: nowrap; }
.map-search-input input::placeholder { color: #99a49d; }
.map-search-input button { background: #316b53; border: 0; border-radius: 6px; color: white; flex: 0 0 auto; font-size: 12px; font-weight: 600; padding: 8px 10px; }
.map-search-input button:disabled { cursor: not-allowed; opacity: .55; }
.map-search-results { background: white; border: 1px solid #e5eae4; border-radius: 9px; box-shadow: 0 5px 18px #1d33271c; list-style: none; margin: 6px 0 0; max-height: 220px; overflow-y: auto; padding: 4px; }
.map-search-results li + li { border-top: 1px solid #f0f2ee; }
.map-search-results li button { background: transparent; border: 0; color: #536158; cursor: pointer; font: inherit; font-size: 12px; line-height: 1.45; padding: 9px; text-align: left; width: 100%; }
.map-search-results li button:hover { background: #f3f6f2; }
.map-search-results .map-search-attribution { color: #98a29c; font-size: 12px; padding: 7px 9px; }
.map-search-message { background: white; border: 1px solid #e5eae4; border-radius: 8px; box-shadow: 0 2px 10px #1d33271c; color: #728078; font-size: 12px; line-height: 1.4; margin: 6px 0 0; padding: 10px; }
</style>
