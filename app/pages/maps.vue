<script setup lang="ts">
import type { FishingSpot, FishingTrip } from '../composables/useFishingData'
import { Geolocation } from '@capacitor/geolocation'
import { formatTripConditions } from '../utils/tripConditions'

useHead({ title: 'Fishing spots · Tidelog', meta: [{ name: 'description', content: 'Map, save, and revisit your favorite fishing spots.' }] })

const { data, addSpot, deleteSpot, loading: dataLoading, error: dataError } = useFishingData()
const { successFeedback } = useNativeFeatures()
const selectedSpotId = ref('')
const waterFilter = ref('')
const kindFilter = ref('')
const showTripMarkers = ref(false)
const selectedTripId = ref('')
const spotModalOpen = ref(false)
const pickMode = ref(false)
const pickedLocation = ref<{ latitude: number; longitude: number } | null>(null)
const spotName = ref('')
const spotWater = ref('')
const spotKind = ref('Freshwater · Lake')
const spotLatitude = ref('')
const spotLongitude = ref('')
const spotNotes = ref('')
const toastMessage = ref('')
const spotActionError = ref('')
const locationError = ref('')
const locating = ref(false)
const deletingSpotId = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const waterBodies = computed(() => {
  const options = new Map<string, string>()
  for (const spot of data.value.spots) {
    const water = spot.water.trim()
    const key = water.toLocaleLowerCase()
    if (key && !options.has(key)) options.set(key, water)
  }
  return [...options].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label))
})
const spotKinds = computed(() => [...new Set(data.value.spots.map(spot => spot.kind.trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b)))
const filteredSpots = computed(() => data.value.spots.filter(spot =>
  (!waterFilter.value || spot.water.trim().toLocaleLowerCase() === waterFilter.value) &&
  (!kindFilter.value || spot.kind.trim() === kindFilter.value)
))
const selectedSpot = computed(() => filteredSpots.value.find(spot => spot.id === selectedSpotId.value) ?? filteredSpots.value[0])
const mappableTrips = computed(() => showTripMarkers.value
  ? data.value.trips.filter(trip => trip.latitude !== undefined && trip.longitude !== undefined)
  : [])
const selectedTrip = computed(() => mappableTrips.value.find(trip => trip.id === selectedTripId.value))
watch(() => data.value.spots, (spots) => {
  const firstSpot = spots[0]
  if (!selectedSpotId.value && firstSpot) selectedSpotId.value = firstSpot.id
}, { immediate: true })
watch(mappableTrips, (trips) => {
  if (!trips.some(trip => trip.id === selectedTripId.value)) selectedTripId.value = ''
})

function selectTrip(tripId: string) {
  selectedTripId.value = tripId
}

function tripCatchSummary(trip: FishingTrip) {
  return trip.catches.map(item => `${item.species} (${item.quantity})`).join(', ') || 'No catches recorded'
}

function tripDateLabel(date: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
    .format(new Date(`${date}T12:00:00`))
}

const mapLink = computed(() => {
  const latitude = selectedSpot.value?.latitude ?? 44.608
  const longitude = selectedSpot.value?.longitude ?? -79.42
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`
})

// Shows a temporary status message; accepts its text and replaces any active dismissal timer.
function showToast(message: string) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2800)
}

// Resets the spot form and enables map picking; takes no input and initializes a new spot draft.
function startSpotPlacement() {
  spotName.value = ''
  spotWater.value = ''
  spotKind.value = 'Freshwater · Lake'
  spotLatitude.value = ''
  spotLongitude.value = ''
  spotNotes.value = ''
  pickedLocation.value = null
  pickMode.value = true
}

// Reads the device location for a new spot; takes no input and opens the spot dialog or sets a visible error.
async function useCurrentLocation() {
  if (locating.value) return
  locating.value = true
  locationError.value = ''
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    })
    pickedLocation.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }
    spotLatitude.value = position.coords.latitude.toFixed(6)
    spotLongitude.value = position.coords.longitude.toFixed(6)
    pickMode.value = false
    spotModalOpen.value = true
  } catch (error) {
    console.error('Could not read the device location for a fishing spot.', error)
    locationError.value = error instanceof Error
      ? `Could not get your location: ${error.message}`
      : 'Could not get your location. Check location permission and try again.'
  } finally {
    locating.value = false
  }
}

// Saves picked map coordinates into the new spot form; accepts latitude/longitude and opens the dialog.
function handleMapPick(coordinates: { latitude: number; longitude: number }) {
  pickedLocation.value = coordinates
  spotLatitude.value = coordinates.latitude.toFixed(6)
  spotLongitude.value = coordinates.longitude.toFixed(6)
  pickMode.value = false
  spotModalOpen.value = true
}

// Cancels spot creation; takes no input and closes the dialog while clearing the temporary map marker.
function cancelSpotModal() {
  spotModalOpen.value = false
  pickedLocation.value = null
}

// Persists a new fishing spot; accepts its fields and displays success or failure feedback.
async function saveSpot(spot: Omit<FishingSpot, 'id'>) {
  try {
    await addSpot(spot)
    void successFeedback()
    selectedSpotId.value = ''
    spotModalOpen.value = false
    pickedLocation.value = null
    showToast('Favorite spot saved to your map.')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Could not save this spot.')
  }
}

// Confirms and deletes a saved spot; accepts the spot and updates selection/error state after deletion.
async function removeSpot(spot: FishingSpot) {
  if (!window.confirm(`Delete the favorite spot "${spot.name}"? This cannot be undone.`)) return

  deletingSpotId.value = spot.id
  spotActionError.value = ''
  try {
    await deleteSpot(spot.id)
    if (selectedSpotId.value === spot.id) {
      selectedSpotId.value = data.value.spots[0]?.id ?? ''
    }
    showToast('Favorite spot deleted.')
  } catch (error) {
    spotActionError.value = error instanceof Error ? error.message : 'Could not delete this spot.'
  } finally {
    deletingSpotId.value = null
  }
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <!-- Map, selected-spot details, and saved-location controls. -->
  <div class="page-wrap">
    <header class="topbar">
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>Fishing spots</strong></div>
      <div class="topbar-right"><a class="secondary-button" :href="mapLink" target="_blank" rel="noreferrer">↗ &nbsp; Open full map</a></div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">YOUR PERSONAL ATLAS</p>
        <h1>Fishing spots</h1>
        <p class="subtitle">Keep your favorite stretches of water close at hand.</p>
      </div>
      <button class="primary-button" @click="pickMode ? (pickMode = false) : startSpotPlacement()">
        <span class="plus">{{ pickMode ? '×' : '＋' }}</span>{{ pickMode ? 'Cancel placement' : 'Pick a spot on map' }}
      </button>
    </section>

    <div v-if="dataError" class="auth-message auth-error" role="alert">{{ dataError }}</div>
    <div v-if="locationError" class="auth-message auth-error" role="alert">{{ locationError }}</div>
    <div class="location-action">
      <button class="secondary-button" type="button" :disabled="locating" @click="useCurrentLocation">
        {{ locating ? 'Finding your location…' : '◎ Use my current location' }}
      </button>
      <span>Your location is only accessed when you tap this button.</span>
    </div>

    <section class="map-filters panel" aria-label="Map filters">
      <label>
        Waterbody
        <select v-model="waterFilter">
          <option value="">All waterbodies</option>
          <option v-for="water in waterBodies" :key="water.key" :value="water.key">{{ water.label }}</option>
        </select>
      </label>
      <label>
        Spot type
        <select v-model="kindFilter">
          <option value="">All types</option>
          <option v-for="kind in spotKinds" :key="kind" :value="kind">{{ kind }}</option>
        </select>
      </label>
      <label class="trip-marker-toggle">
        <input v-model="showTripMarkers" type="checkbox">
        <span>Show logged trips on map</span>
      </label>
      <span v-if="showTripMarkers" class="trip-marker-legend"><i aria-hidden="true" />Past trips</span>
      <span class="map-filter-count">{{ filteredSpots.length }} of {{ data.spots.length }} spots shown<span v-if="showTripMarkers"> · {{ mappableTrips.length }} trips mapped</span></span>
    </section>

    <div class="map-layout">
      <section class="map-panel" aria-label="Map of selected fishing spot">
        <FishingMap
          :spots="filteredSpots"
          :trips="mappableTrips"
          :selected-spot-id="selectedSpot?.id"
          :pick-mode="pickMode"
          :picked-location="pickedLocation"
          @select="selectedSpotId = $event"
          :selected-trip-id="selectedTripId"
          @select-trip="selectTrip"
          @pick="handleMapPick"
        />
        <div v-if="pickMode" class="map-pick-prompt" role="status">Click the map to place your fishing spot</div>
      </section>

      <aside class="map-side">
        <article v-if="selectedTrip" class="panel selected-trip-summary">
          <div class="section-heading">
            <h2>Trip details</h2>
            <button class="text-button" type="button" @click="selectedTripId = ''">Clear</button>
          </div>
          <strong>{{ selectedTrip.location }}</strong>
          <span class="selected-trip-date">{{ tripDateLabel(selectedTrip.date) }}</span>
          <p><b>Catches:</b> {{ tripCatchSummary(selectedTrip) }}</p>
          <p><b>Conditions:</b> {{ formatTripConditions(selectedTrip) || 'Not recorded' }}</p>
          <p><b>Gear:</b> {{ [selectedTrip.rod, selectedTrip.reel, ...(selectedTrip.lures?.map(lure => lure.name) ?? [])].filter(Boolean).join(', ') || 'Not recorded' }}</p>
        </article>
        <article v-if="selectedSpot" class="panel spot-summary">
          <div class="spot-summary-head">
            <div><p class="eyebrow">SAVED PLACE</p><h2>{{ selectedSpot.name }}</h2><p class="spot-kind">{{ selectedSpot.water }} · {{ selectedSpot.kind }}</p></div>
            <span class="favorite-heart" aria-label="Favorite spot">♥</span>
          </div>
          <div class="coordinate-row"><span>Latitude</span><strong>{{ selectedSpot.latitude.toFixed(4) }}°</strong></div>
          <div class="coordinate-row" style="border-top:0;margin-top:0;padding-top:8px"><span>Longitude</span><strong>{{ selectedSpot.longitude.toFixed(4) }}°</strong></div>
          <p v-if="selectedSpot.notes" class="spot-notes">{{ selectedSpot.notes }}</p>
        </article>
        <article v-else class="panel empty-state" style="padding:27px 15px">
          <span>⌖</span><strong>{{ data.spots.length ? 'No spots match these filters' : 'No favorite spots yet' }}</strong><span>{{ data.spots.length ? 'Adjust the waterbody or spot type filters.' : 'Save a spot to see it on your map.' }}</span>
          <button v-if="!data.spots.length" class="text-button" @click="startSpotPlacement">Choose a place on the map →</button>
        </article>

        <section class="panel spot-browser">
          <div class="section-heading">
            <h2>Your saved spots</h2>
            <span class="spot-count" :aria-label="`${filteredSpots.length} of ${data.spots.length} saved spots shown`">{{ filteredSpots.length }} / {{ data.spots.length }}</span>
          </div>
          <p v-if="spotActionError" class="auth-message auth-error" role="alert">{{ spotActionError }}</p>
          <div v-for="spot in filteredSpots" :key="spot.id" class="spot-select-row">
            <button
              class="spot-select"
              :class="{ 'spot-select-active': selectedSpot?.id === spot.id }"
              :aria-pressed="selectedSpot?.id === spot.id"
              @click="selectedSpotId = spot.id"
            >
              <span class="spot-pin" aria-hidden="true">⌖</span>
              <span class="spot-select-copy"><strong>{{ spot.name }}</strong><span>{{ spot.water }} · {{ spot.kind.split(' · ').at(-1) }}</span></span>
            </button>
            <button
              class="spot-delete-button"
              type="button"
              :disabled="deletingSpotId !== null"
              :aria-label="`Delete favorite spot ${spot.name}`"
              :title="deletingSpotId === spot.id ? 'Deleting spot…' : 'Delete favorite spot'"
              @click="removeSpot(spot)"
            >{{ deletingSpotId === spot.id ? '…' : '×' }}</button>
          </div>
          <div v-if="!filteredSpots.length" class="empty-state" style="padding:16px 4px;font-size:12px">{{ data.spots.length ? 'No spots match these filters.' : 'Your saved places will show up here.' }}</div>
          <div v-if="dataLoading" class="empty-state" style="padding:16px 4px;font-size:12px">Loading your saved spots…</div>
          <button class="text-button" style="margin-top:8px" @click="startSpotPlacement">＋ Add another spot</button>
        </section>

        <div class="map-hint">{{ pickMode ? 'Click anywhere on the map to drop a pin. You can add the spot name and notes next.' : 'Choose a saved place to center the map, or pick a spot to drop a new pin.' }} Your spots stay private to your account.</div>
      </aside>
    </div>
  </div>

  <!-- Place the save form above the map and app layout stacking contexts. -->
  <Teleport to="body">
    <div v-if="spotModalOpen" class="modal-backdrop" @click.self="cancelSpotModal">
      <form class="modal" @submit.prevent="saveSpot({
        name: spotName.trim(),
        water: spotWater.trim(),
        kind: spotKind,
        latitude: Number(spotLatitude),
        longitude: Number(spotLongitude),
        notes: spotNotes.trim()
      })">
        <div class="modal-header">
          <div><p class="eyebrow">YOUR PERSONAL ATLAS</p><h2>Save a fishing spot</h2><p>Give your map pin a name and a few helpful details.</p></div>
          <button class="modal-close" type="button" aria-label="Close dialog" @click="cancelSpotModal">×</button>
        </div>
        <div class="form-grid">
          <div class="form-field form-field-full"><label for="spot-name">Spot name</label><input id="spot-name" v-model="spotName" placeholder="e.g. Orillia shoreline" required maxlength="80"></div>
          <div class="form-field"><label for="spot-water">Water / place</label><input id="spot-water" v-model="spotWater" placeholder="e.g. Lake Simcoe" required maxlength="80"></div>
          <div class="form-field"><label for="spot-kind">Type</label><select id="spot-kind" v-model="spotKind"><option>Freshwater · Lake</option><option>Freshwater · River</option><option>Freshwater · Creek</option><option>Saltwater · Shore</option><option>Saltwater · Bay</option><option>Other</option></select></div>
          <div class="form-field form-field-full"><span class="coordinate-label">Map pin selected</span><span v-if="pickedLocation" class="coordinate-value">{{ pickedLocation.latitude.toFixed(5) }}, {{ pickedLocation.longitude.toFixed(5) }}</span></div>
          <div class="form-field form-field-full"><label for="spot-notes">A note for next time <span style="color:#9aa59e;font-weight:400">(optional)</span></label><textarea id="spot-notes" v-model="spotNotes" placeholder="Access, best time of day, what tends to bite…" maxlength="500" /></div>
        </div>
        <div class="form-actions"><button class="cancel-button" type="button" @click="cancelSpotModal">Cancel</button><button class="primary-button" type="submit" :disabled="!pickedLocation">Save favorite spot</button></div>
      </form>
    </div>
  </Teleport>
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>

<style scoped>
.location-action { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; margin: -9px 0 15px; }
.location-action > span { color: #89958e; font-size: 12px; }
.location-action .secondary-button { min-height: 38px; }
.map-filters { align-items: end; display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 15px; padding: 13px 15px; }
.map-filters > label:not(.trip-marker-toggle) { color: #58675e; display: grid; flex: 1 1 170px; font-size: 12px; font-weight: 600; gap: 5px; }
.map-filters select { background: white; border: 1px solid #e3e8e2; border-radius: 7px; color: #536158; font-size: 12px; min-height: 38px; padding: 8px 10px; }
.trip-marker-toggle { align-items: center; color: #536158; display: flex; font-size: 12px; gap: 7px; min-height: 38px; }
.trip-marker-toggle input { accent-color: #316b53; height: 16px; width: 16px; }
.trip-marker-legend { align-items: center; color: #718078; display: inline-flex; font-size: 12px; gap: 6px; min-height: 38px; }
.trip-marker-legend i { background: #8066a8; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 0 1px #8066a8; height: 11px; width: 11px; }
.map-filter-count { color: #89958e; font-size: 12px; margin-left: auto; min-height: 38px; display: flex; align-items: center; }
.selected-trip-summary { display: grid; gap: 7px; padding: 14px; }
.selected-trip-summary .section-heading { margin: 0; }
.selected-trip-summary .section-heading h2 { font-size: 13px; }
.selected-trip-summary > strong { color: #425148; font-size: 13px; overflow-wrap: anywhere; }
.selected-trip-date { color: #89958e; font-size: 11px; }
.selected-trip-summary p { color: #718078; font-size: 12px; line-height: 1.45; margin: 0; overflow-wrap: anywhere; }
.selected-trip-summary p b { color: #536158; }
.spot-select-row { align-items: center; display: flex; gap: 4px; }
.spot-select-row .spot-select { min-width: 0; }
.spot-delete-button { align-items: center; background: transparent; border: 1px solid transparent; border-radius: 7px; color: #985b45; display: flex; flex: 0 0 34px; font-size: 17px; height: 34px; justify-content: center; }
.spot-delete-button:hover:not(:disabled) { background: #fbf0ec; border-color: #f0d8ce; }
.spot-delete-button:disabled { cursor: wait; opacity: .55; }
.spot-browser .auth-message { margin-bottom: 8px; }
.spot-count { align-items: center; background: #eaf2ec; border: 1px solid #d9e7da; border-radius: 999px; color: #315f48; display: inline-flex; font: 700 13px/1 Manrope,sans-serif; justify-content: center; min-height: 29px; min-width: 33px; padding: 0 9px; }
@media (max-width: 500px) {
  .spot-delete-button { flex-basis: 44px; height: 44px; }
}
</style>
