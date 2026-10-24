<script setup lang="ts">
import type { FishingLure } from '../composables/useFishingData'
import { ontarioFishSpecies } from '../data/ontarioFishSpecies'
import type { CatchDraft } from '../types/tripCatchDraft'

const props = defineProps<{
  catches: CatchDraft[]
  lures: Array<FishingLure & { id: number }>
  isNative: boolean
  capturePhoto: (catchItem: CatchDraft) => void
  removePhoto: (catchItem: CatchDraft, event: MouseEvent) => void
}>()

const emit = defineEmits<{
  add: []
  remove: [id: number]
  toggleDetails: [catchItem: CatchDraft]
}>()

// Reports whether any catch row has a species entered; returns a boolean for the empty-state prompt.
const hasRecordedCatches = computed(() =>
  props.catches.some(({ species }) => species.trim().length > 0)
)
</script>

<template>
  <div class="form-field form-field-full">
    <div class="catch-form-heading">
      <label>Your catches <span>(optional)</span></label>
      <button class="text-button" type="button" @click="emit('add')">＋ Add a species</button>
    </div>
    <p class="catch-photo-status-text">Type to search the species list, or enter a species name.</p>
    <p v-if="!hasRecordedCatches" class="catch-photo-status-text">No catches? Better luck next time!</p>
    <datalist id="ontario-fish-species">
      <option v-for="fish in ontarioFishSpecies" :key="fish" :value="fish" />
    </datalist>
    <div
      v-for="(catchItem, index) in catches"
      :key="catchItem.id"
      class="catch-form-row"
    >
      <input
        v-model="catchItem.species"
        list="ontario-fish-species"
        :aria-label="`Species for catch ${index + 1}`"
        placeholder="Type to search species..."
        maxlength="60"
      >
      <input
        v-model.number="catchItem.quantity"
        :aria-label="`Quantity for catch ${index + 1}`"
        type="number"
        min="1"
        max="999"
        required
        :disabled="catchItem.individualDetails"
      >
      <button
        class="remove-catch-button"
        type="button"
        :aria-label="`Remove catch ${index + 1}`"
        @click="emit('remove', catchItem.id)"
      >×</button>
      <select
        v-if="lures.length"
        v-model="catchItem.lureId"
        class="catch-setup-select"
        :aria-label="`Setup for catch ${index + 1}`"
      >
        <option value="">No specific lure</option>
        <option v-for="lure in lures" :key="lure.id" :value="lure.id">
          {{ lure.name }}{{ lure.notes ? ` — ${lure.notes}` : '' }}
        </option>
      </select>
      <div class="catch-detail-actions">
        <button
          class="text-button"
          type="button"
          :aria-expanded="catchItem.individualDetails"
          @click="emit('toggleDetails', catchItem)"
        >{{ catchItem.individualDetails ? '− Hide fish details' : '＋ Add individual fish details' }}</button>
        <span v-if="catchItem.individualDetails" class="catch-photo-status-text">Detailed entry counts as one fish.</span>
      </div>
      <div v-if="catchItem.individualDetails" class="individual-catch-details">
        <div class="individual-catch-fields">
          <label>
            <span>Length</span>
            <input v-model="catchItem.length" :aria-label="`Length of catch ${index + 1}`" placeholder="e.g. 18 in" maxlength="30">
          </label>
          <label>
            <span>Weight</span>
            <input v-model="catchItem.weight" :aria-label="`Weight of catch ${index + 1}`" placeholder="e.g. 2 lb 4 oz" maxlength="30">
          </label>
          <label>
            <span>Fish status</span>
            <select v-model="catchItem.releaseStatus" :aria-label="`Release status of catch ${index + 1}`">
              <option value="">Not specified</option>
              <option value="released">Released</option>
              <option value="kept">Kept</option>
            </select>
          </label>
          <div class="catch-photo-field">
            <span>Photo</span>
            <button class="native-photo-button" type="button" @click="capturePhoto(catchItem)">
              {{ isNative ? 'Take or choose a photo' : 'Choose a photo' }}
            </button>
          </div>
        </div>
        <p v-if="catchItem.photoError" class="catch-photo-error" role="alert">{{ catchItem.photoError }}</p>
        <div v-if="catchItem.photoFile || catchItem.photo" class="catch-photo-status">
          <span>{{ catchItem.photoFile?.name ?? 'A fish photo is saved' }}</span>
          <button class="text-button" type="button" @click="removePhoto(catchItem, $event)">Remove photo</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.catch-form-heading { align-items: center; display: flex; justify-content: space-between; }
.catch-form-heading label span { color: #69776e; font-size: 12px; font-weight: 400; }
.catch-photo-status-text { color: #69776e; font-size: 12px; margin: 7px 0 0; }
.catch-form-row { align-items: center; display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) 96px 40px; margin-top: 8px; }
.catch-form-row select,.catch-form-row input { min-width: 0; }
.catch-form-row .catch-setup-select { grid-column: 1/-1; }
.catch-form-row > input:disabled { background: #f4f6f2; color: #77847c; }
.catch-detail-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; grid-column: 1/-1; }
.individual-catch-details { background: #f8faf7; border: 1px solid #edf1eb; border-radius: 8px; grid-column: 1/-1; padding: 10px; }
.individual-catch-fields { display: grid; gap: 9px; grid-template-columns: repeat(2, minmax(0,1fr)); }
.individual-catch-fields label,.catch-photo-field { color: #69776e; display: grid; font-size: 12px; gap: 5px; min-width: 0; }
.individual-catch-fields input,.individual-catch-fields select { min-width: 0; width: 100%; }
.native-photo-button { background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #536158; font-size: 12px; min-height: 40px; padding: 7px 9px; text-align: left; }
.native-photo-button:hover { border-color: #a6b9a8; }
.catch-photo-error { color: #985b45; font-size: 12px; margin: 7px 0 0; }
.catch-photo-status { align-items: center; color: #69776e; display: flex; flex-wrap: wrap; font-size: 12px; gap: 8px; justify-content: space-between; margin-top: 8px; overflow-wrap: anywhere; }
.remove-catch-button { align-items: center; background: #f6f7f4; border: 1px solid #e5e9e3; border-radius: 7px; color: #78857d; display: flex; font-size: 20px; height: 40px; justify-content: center; }
@media (max-width: 500px) {
  .catch-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 64px 40px; }
  .catch-form-row select,.catch-form-row input { min-height: 44px; }
  .individual-catch-fields { grid-template-columns: minmax(0,1fr); }
  .remove-catch-button { height: 44px; }
}
</style>
