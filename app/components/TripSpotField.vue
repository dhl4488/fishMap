<script setup lang="ts">
import type { FishingSpot } from '../composables/useFishingData'

const props = defineProps<{
  spots: FishingSpot[]
  loading?: boolean
}>()

const location = defineModel<string>({ required: true })
const coordinates = defineModel<{ latitude: number; longitude: number } | null>('coordinates', { default: null })
const water = defineModel<string>('water', { default: '' })
const kind = defineModel<string>('kind', { default: 'Freshwater · Lake' })
const notes = defineModel<string>('notes', { default: '' })
const query = ref('')
const pickerOpen = ref(false)
const picker = ref<HTMLElement | null>(null)
const selectedSpotId = ref<string>()

function pickLocation(value: { latitude: number; longitude: number }) {
  selectedSpotId.value = undefined
  if (coordinates.value &&
    (coordinates.value.latitude !== value.latitude || coordinates.value.longitude !== value.longitude)) {
    location.value = ''
    water.value = ''
    kind.value = 'Freshwater · Lake'
    notes.value = ''
  }
  coordinates.value = value
}

// Filters saved spots against their name, water, and kind; returns the matching spot records.
const filteredSpots = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  return props.spots.filter(spot =>
    `${spot.name} ${spot.water} ${spot.kind}`.toLocaleLowerCase().includes(search)
  )
})

// Selects a saved spot as the location and clears/closes the picker.
function selectSpot(spot: FishingSpot) {
  location.value = spot.name
  coordinates.value = { latitude: spot.latitude, longitude: spot.longitude }
  selectedSpotId.value = spot.id
  water.value = spot.water
  kind.value = spot.kind
  notes.value = spot.notes
  query.value = ''
  pickerOpen.value = false
}

// Closes the saved-spot search results when a pointer event occurs outside the picker.
function closePickerOnOutsideClick(event: PointerEvent) {
  if (!(event.target instanceof Node)) return
  if (!picker.value?.contains(event.target)) pickerOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', closePickerOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closePickerOnOutsideClick))
</script>

<template>
  <section class="form-field form-field-full pick-spot-card" aria-labelledby="pick-spot-title">
    <div class="pick-spot-heading">
      <span class="saved-spot-pin" aria-hidden="true">⌖</span>
      <div>
        <h4 id="pick-spot-title">Pick a spot</h4>
        <p>Tap the map to pin where you fished, or choose one of your saved spots.</p>
      </div>
    </div>
    <div class="trip-map-picker">
      <FishingMap
        :spots="spots"
        :selected-spot-id="selectedSpotId"
        :pick-mode="true"
        :picked-location="coordinates"
        @pick="pickLocation"
      />
      <p class="map-pick-prompt" role="status">
        {{ coordinates ? 'Pin selected · Tap map to move' : 'Tap map to place your pin' }}
      </p>
    </div>
    <div v-if="spots.length || loading" ref="picker" class="saved-spot-picker">
      <label v-if="spots.length" for="trip-saved-spot-search">Or choose a saved spot</label>
      <div v-if="spots.length" class="saved-spot-search">
        <span aria-hidden="true">⌕</span>
        <input
          id="trip-saved-spot-search"
          v-model="query"
          type="search"
          aria-label="Search saved spots"
          aria-controls="saved-spot-results"
          :aria-expanded="pickerOpen"
          placeholder="Search saved spots…"
          @focus="pickerOpen = true"
          @keydown.esc="pickerOpen = false"
        >
        <button
          v-if="query"
          class="saved-spot-clear"
          type="button"
          aria-label="Clear saved spot search"
          @click="query = ''; pickerOpen = true"
        >×</button>
        <div v-if="pickerOpen" id="saved-spot-results" class="saved-spot-results" role="listbox" aria-label="Saved spots">
          <button
            v-for="spot in filteredSpots"
            :key="spot.id"
            class="saved-spot-option"
            :class="{ 'saved-spot-option-active': location === spot.name }"
            type="button"
            role="option"
            :aria-selected="location === spot.name"
            @click="selectSpot(spot)"
          >
            <span class="saved-spot-pin" aria-hidden="true">⌖</span>
            <span class="saved-spot-copy">
              <strong>{{ spot.name }}</strong>
              <span>{{ spot.water }} · {{ spot.kind.split(' · ').at(-1) }}</span>
            </span>
            <span v-if="location === spot.name" class="saved-spot-selected">Selected</span>
          </button>
          <p v-if="!filteredSpots.length" class="saved-spot-empty">No saved spots match that search.</p>
        </div>
      </div>
      <p v-else class="photo-status">Loading your saved spots…</p>
    </div>
    <div v-if="coordinates || location" class="spot-metadata-fields">
      <div class="form-field">
        <label for="trip-location">Spot name</label>
        <input
          id="trip-location"
          v-model="location"
          placeholder="e.g. Orillia shoreline"
          required
          maxlength="80"
        >
      </div>
      <div class="form-field">
        <label for="trip-spot-water">Water / place</label>
        <input id="trip-spot-water" v-model="water" placeholder="e.g. Lake Simcoe" required maxlength="80">
      </div>
      <div class="form-field">
        <label for="trip-spot-kind">Type</label>
        <select id="trip-spot-kind" v-model="kind">
          <option>Freshwater · Lake</option>
          <option>Freshwater · River</option>
          <option>Freshwater · Creek</option>
          <option>Saltwater · Shore</option>
          <option>Saltwater · Bay</option>
          <option>Other</option>
        </select>
      </div>
      <div class="form-field spot-notes-field">
        <label for="trip-spot-notes">A note for next time <span>(optional)</span></label>
        <textarea id="trip-spot-notes" v-model="notes" placeholder="Access, best time of day, what tends to bite…" maxlength="500" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.pick-spot-card { background: #f8faf7; border: 1px solid #edf1eb; border-radius: 9px; gap: 10px; padding: 12px; }
.pick-spot-heading { align-items: flex-start; display: flex; gap: 9px; }
.pick-spot-heading h4 { color: #425148; font-size: 14px; margin: 0; }
.pick-spot-heading p { color: #89958e; font-size: 12px; line-height: 1.4; margin: 3px 0 0; }
.trip-map-picker { border: 1px solid #e3e8e2; border-radius: 8px; overflow: hidden; position: relative; }
.trip-map-picker :deep(.fishing-map-frame),.trip-map-picker :deep(.fishing-map) { height: clamp(280px, 48dvh, 500px); min-height: 280px; }
.trip-map-picker :deep(.fishing-map .leaflet-container) { height: 100%; min-height: 0; }
.trip-map-picker :deep(.map-search) { max-width: min(300px, calc(100% - 24px)); right: 7px; top: 7px; }
.map-pick-prompt { background: #fff; border-radius: 6px; bottom: 8px; box-shadow: 0 2px 8px #1d33271c; box-sizing: border-box; color: #536158; font-size: 11px; left: 8px; margin: 0; max-width: calc(100% - 16px); overflow-wrap: anywhere; padding: 6px 8px; position: absolute; z-index: 500; }
.saved-spot-picker { display: grid; gap: 5px; }
.saved-spot-picker > label { color: #58675e; font-size: 12px; font-weight: 600; }
.saved-spot-search { align-items: center; background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #89958e; display: flex; gap: 8px; margin-top: 3px; padding: 0 9px; position: relative; }
.saved-spot-search:focus-within { border-color: #87a88c; box-shadow: 0 0 0 3px #eaf2eb; }
.saved-spot-search > span { font-size: 17px; line-height: 1; }
.saved-spot-search input { background: transparent; border: 0; color: #34433a; flex: 1; font-size: 12px; height: 36px; min-width: 0; outline: 0; padding: 0; }
.saved-spot-clear { background: transparent; border: 0; color: #89958e; font-size: 17px; padding: 3px; }
.saved-spot-results { background: #fff; border: 1px solid #e1e8e0; border-radius: 8px; box-shadow: 0 8px 22px #1938271c; left: 0; max-height: 190px; overflow-y: auto; padding: 4px; position: absolute; right: 0; top: calc(100% + 5px); z-index: 20; }
.saved-spot-option { align-items: center; background: transparent; border: 0; border-radius: 6px; color: #425148; display: flex; gap: 8px; min-height: 42px; padding: 6px 8px; text-align: left; width: 100%; }
.saved-spot-option:hover,.saved-spot-option-active { background: #edf5ed; }
.saved-spot-pin { align-items: center; background: #eaf2ec; border-radius: 6px; color: #54795d; display: flex; flex: 0 0 27px; height: 27px; justify-content: center; }
.saved-spot-copy { display: grid; gap: 3px; min-width: 0; }
.saved-spot-copy strong { color: #425148; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-spot-copy span { color: #8d9992; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-spot-selected { color: #54795d; font-size: 12px; margin-left: auto; white-space: nowrap; }
.saved-spot-empty { color: #89958e; font-size: 12px; margin: 0; padding: 11px 9px; }
.photo-status { color: #89958e; font-size: 12px; margin: 7px 0 0; }
.spot-metadata-fields { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.spot-notes-field { grid-column: 1 / -1; }
.spot-notes-field textarea { min-height: 78px; resize: vertical; }
@media (max-width: 500px) {
  .saved-spot-option { min-height: 44px; }
  .spot-metadata-fields { grid-template-columns: minmax(0, 1fr); }
  .spot-notes-field { grid-column: auto; }
}
</style>
