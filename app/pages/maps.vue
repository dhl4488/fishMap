<script setup lang="ts">
import type { FishingSpot } from '../composables/useFishingData'

useHead({ title: 'Fishing spots · Tidelog', meta: [{ name: 'description', content: 'Map, save, and revisit your favorite fishing spots.' }] })

const { data, addSpot, loading: dataLoading, error: dataError } = useFishingData()
const selectedSpotId = ref('')
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
let toastTimer: ReturnType<typeof setTimeout> | undefined

const selectedSpot = computed(() => data.value.spots.find(spot => spot.id === selectedSpotId.value) ?? data.value.spots[0])
watch(() => data.value.spots, (spots) => {
  const firstSpot = spots[0]
  if (!selectedSpotId.value && firstSpot) selectedSpotId.value = firstSpot.id
}, { immediate: true })

const mapLink = computed(() => {
  const latitude = selectedSpot.value?.latitude ?? 44.608
  const longitude = selectedSpot.value?.longitude ?? -79.42
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`
})

function showToast(message: string) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2800)
}

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

function handleMapPick(coordinates: { latitude: number; longitude: number }) {
  pickedLocation.value = coordinates
  spotLatitude.value = coordinates.latitude.toFixed(6)
  spotLongitude.value = coordinates.longitude.toFixed(6)
  pickMode.value = false
  spotModalOpen.value = true
}

function cancelSpotModal() {
  spotModalOpen.value = false
  pickedLocation.value = null
}

async function saveSpot(spot: Omit<FishingSpot, 'id'>) {
  try {
    await addSpot(spot)
    selectedSpotId.value = ''
    spotModalOpen.value = false
    pickedLocation.value = null
    showToast('Favorite spot saved to your map.')
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Could not save this spot.')
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

    <div class="map-layout">
      <section class="map-panel" aria-label="Map of selected fishing spot">
        <FishingMap
          :spots="data.spots"
          :selected-spot-id="selectedSpot?.id"
          :pick-mode="pickMode"
          :picked-location="pickedLocation"
          @select="selectedSpotId = $event"
          @pick="handleMapPick"
        />
        <div v-if="pickMode" class="map-pick-prompt" role="status">Click the map to place your fishing spot</div>
      </section>

      <aside class="map-side">
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
          <span>⌖</span><strong>No favorite spots yet</strong><span>Save a spot to see it on your map.</span>
          <button class="text-button" @click="startSpotPlacement">Choose a place on the map →</button>
        </article>

        <section class="panel spot-browser">
          <div class="section-heading"><h2>Your saved spots</h2><span style="color:#9aa59e;font-size:10px">{{ data.spots.length }}</span></div>
          <button
            v-for="spot in data.spots"
            :key="spot.id"
            class="spot-select"
            :class="{ 'spot-select-active': selectedSpot?.id === spot.id }"
            :aria-pressed="selectedSpot?.id === spot.id"
            @click="selectedSpotId = spot.id"
          >
            <span class="spot-pin" aria-hidden="true">⌖</span>
            <span class="spot-select-copy"><strong>{{ spot.name }}</strong><span>{{ spot.water }} · {{ spot.kind.split(' · ').at(-1) }}</span></span>
          </button>
          <div v-if="!data.spots.length" class="empty-state" style="padding:16px 4px;font-size:10px">Your saved places will show up here.</div>
          <div v-if="dataLoading" class="empty-state" style="padding:16px 4px;font-size:10px">Loading your saved spots…</div>
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
