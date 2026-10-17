<script setup lang="ts">
import type { FishingSpot } from '../composables/useFishingData'

useHead({ title: 'Fishing spots · Tidelog', meta: [{ name: 'description', content: 'Map, save, and revisit your favorite fishing spots.' }] })

const { data, addSpot } = useFishingData()
const selectedSpotId = ref('')
const spotModalOpen = ref(false)
const spotName = ref('')
const spotWater = ref('')
const spotKind = ref('Freshwater · Lake')
const spotLatitude = ref('')
const spotLongitude = ref('')
const spotNotes = ref('')
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const selectedSpot = computed(() => data.value.spots.find(spot => spot.id === selectedSpotId.value) ?? data.value.spots[0])
const mapSource = computed(() => {
  const latitude = selectedSpot.value?.latitude ?? 44.0521
  const longitude = selectedSpot.value?.longitude ?? -123.0868
  const latitudePadding = 0.035
  const longitudePadding = 0.05
  // OSM's bbox order is west, south, east, north.
  const bounds = [longitude - longitudePadding, latitude - latitudePadding, longitude + longitudePadding, latitude + latitudePadding].join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${latitude}%2C${longitude}`
})
const mapLink = computed(() => {
  const latitude = selectedSpot.value?.latitude ?? 44.0521
  const longitude = selectedSpot.value?.longitude ?? -123.0868
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`
})

function showToast(message: string) {
  toastMessage.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2800)
}

function openSpotModal() {
  spotName.value = ''
  spotWater.value = ''
  spotKind.value = 'Freshwater · Lake'
  spotLatitude.value = ''
  spotLongitude.value = ''
  spotNotes.value = ''
  spotModalOpen.value = true
}

function saveSpot(spot: Omit<FishingSpot, 'id'>) {
  addSpot(spot)
  selectedSpotId.value = ''
  spotModalOpen.value = false
  showToast('Favorite spot saved to your map.')
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
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
      <button class="primary-button" @click="openSpotModal"><span class="plus">＋</span> Save a spot</button>
    </section>

    <div class="map-layout">
      <section class="map-panel" aria-label="Map of selected fishing spot">
        <iframe :src="mapSource" :title="selectedSpot ? `Map showing ${selectedSpot.name}` : 'Map of your fishing spots'" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
        <div class="map-attribution">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></div>
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
          <button class="text-button" @click="openSpotModal">Save your first spot →</button>
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
          <button class="text-button" style="margin-top:8px" @click="openSpotModal">＋ Add another spot</button>
        </section>

        <div class="map-hint">Choose a saved place to center the map on it. Your spots stay private in this browser.</div>
      </aside>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="spotModalOpen" class="modal-backdrop" @click.self="spotModalOpen = false">
      <form class="modal" @submit.prevent="saveSpot({
        name: spotName.trim(),
        water: spotWater.trim(),
        kind: spotKind,
        latitude: Number(spotLatitude),
        longitude: Number(spotLongitude),
        notes: spotNotes.trim()
      })">
        <div class="modal-header">
          <div><p class="eyebrow">YOUR PERSONAL ATLAS</p><h2>Save a fishing spot</h2><p>Add its coordinates to see it on your map.</p></div>
          <button class="modal-close" type="button" aria-label="Close dialog" @click="spotModalOpen = false">×</button>
        </div>
        <div class="form-grid">
          <div class="form-field form-field-full"><label for="spot-name">Spot name</label><input id="spot-name" v-model="spotName" placeholder="e.g. The quiet bend" required maxlength="80"></div>
          <div class="form-field"><label for="spot-water">Water / place</label><input id="spot-water" v-model="spotWater" placeholder="e.g. Pine Lake" required maxlength="80"></div>
          <div class="form-field"><label for="spot-kind">Type</label><select id="spot-kind" v-model="spotKind"><option>Freshwater · Lake</option><option>Freshwater · River</option><option>Freshwater · Creek</option><option>Saltwater · Shore</option><option>Saltwater · Bay</option><option>Other</option></select></div>
          <div class="form-field"><label for="spot-lat">Latitude</label><input id="spot-lat" v-model="spotLatitude" type="number" min="-90" max="90" step="any" placeholder="44.0521" required></div>
          <div class="form-field"><label for="spot-lon">Longitude</label><input id="spot-lon" v-model="spotLongitude" type="number" min="-180" max="180" step="any" placeholder="-123.0868" required></div>
          <div class="form-field form-field-full"><label for="spot-notes">A note for next time <span style="color:#9aa59e;font-weight:400">(optional)</span></label><textarea id="spot-notes" v-model="spotNotes" placeholder="Access, best time of day, what tends to bite…" maxlength="500" /></div>
        </div>
        <div class="form-actions"><button class="cancel-button" type="button" @click="spotModalOpen = false">Cancel</button><button class="primary-button" type="submit">Save favorite spot</button></div>
      </form>
    </div>
  </Teleport>
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>
