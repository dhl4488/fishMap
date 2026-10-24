<script setup lang="ts">
import type { FishingSpot } from '../composables/useFishingData'

const props = defineProps<{
  spots: FishingSpot[]
  loading?: boolean
}>()

const location = defineModel<string>({ required: true })
const query = ref('')
const pickerOpen = ref(false)
const picker = ref<HTMLElement | null>(null)

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
  <div class="form-field">
    <label for="trip-location">Where did you fish?</label>
    <input
      id="trip-location"
      v-model="location"
      placeholder="e.g. Grand River near Paris"
      required
      maxlength="80"
    >
  </div>
  <div v-if="spots.length || loading" ref="picker" class="form-field form-field-full saved-spot-field">
    <label>Quick add a saved spot <span>(optional)</span></label>
    <p class="saved-spot-hint">Choose a spot to fill in the location. You can edit it afterward.</p>
    <div v-if="spots.length" class="saved-spot-search">
      <span aria-hidden="true">⌕</span>
      <input
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
</template>

<style scoped>
.saved-spot-field { background: #f8faf7; border: 1px solid #edf1eb; border-radius: 9px; gap: 5px; padding: 10px 11px; }
.saved-spot-field > label span { color: #98a39c; font-size: 12px; font-weight: 400; }
.saved-spot-hint { color: #89958e; font-size: 12px; line-height: 1.4; margin: 0; }
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
@media (max-width: 500px) {
  .saved-spot-option { min-height: 44px; }
}
</style>
