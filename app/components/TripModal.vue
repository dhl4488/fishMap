<script setup lang="ts">
import type { FishingTrip } from '../composables/useFishingData'
import { ontarioFishSpecies } from '../data/ontarioFishSpecies'

interface CatchDraft {
  id: number
  species: string
  customSpecies: string
  quantity: number
}

const props = defineProps<{ modelValue: boolean; saving?: boolean; saveError?: string | null }>()
const emit = defineEmits<{
  close: []
  save: [trip: Omit<FishingTrip, 'id'>, photos: File[]]
}>()

function localDateString(date: Date) {
  // Offset before ISO formatting to preserve the calendar date in the user's timezone.
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

const today = localDateString(new Date())
const date = ref(today)
const location = ref('')
const catches = ref<CatchDraft[]>([])
const nextCatchId = ref(0)
const conditions = ref('')
const notes = ref('')

function newCatch(): CatchDraft {
  return { id: nextCatchId.value++, species: '', customSpecies: '', quantity: 1 }
}

function resetDraft() {
  date.value = today
  location.value = ''
  catches.value = [newCatch()]
  conditions.value = ''
  notes.value = ''
}

function addCatch() {
  catches.value.push(newCatch())
}

function removeCatch(id: number) {
  catches.value = catches.value.filter(item => item.id !== id)
}

// Reset draft fields whenever the dialog opens so a new entry starts clean.
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) resetDraft()
})

function submitTrip() {
  const tripCatches = catches.value
    .map(({ species, customSpecies, quantity }) => ({
      species: (species === 'other' ? customSpecies : species).trim(),
      quantity
    }))
    .filter(item => item.species.length > 0)

  emit('save', {
    date: date.value,
    location: location.value.trim(),
    catches: tripCatches,
    conditions: conditions.value.trim(),
    notes: notes.value.trim()
  }, [])
}

</script>

<template>
  <!-- Teleport keeps the modal above app layout stacking contexts. -->
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" @click.self="!saving && emit('close')" @keydown.esc="!saving && emit('close')">
      <form class="modal" @submit.prevent="submitTrip">
        <div class="modal-header">
          <div>
            <p class="eyebrow">A NEW ENTRY</p>
            <h2>Log a fishing trip</h2>
            <p>Hold on to the little details that make a day.</p>
          </div>
          <button class="modal-close" type="button" aria-label="Close dialog" :disabled="saving" @click="emit('close')">×</button>
        </div>
        <p v-if="saveError" class="trip-save-error" role="alert">{{ saveError }}</p>
        <div class="form-grid">
          <div class="form-field">
            <label for="trip-date">Date</label>
            <input id="trip-date" v-model="date" type="date" required>
          </div>
          <div class="form-field">
            <label for="trip-location">Where did you fish?</label>
            <input id="trip-location" v-model="location" placeholder="e.g. Grand River near Paris" required maxlength="80">
          </div>

          <div class="form-field form-field-full">
            <div class="catch-form-heading">
              <label>Your catches <span>(optional)</span></label>
              <button class="text-button" type="button" @click="addCatch">＋ Add a species</button>
            </div>
            <div
              v-for="(catchItem, index) in catches"
              :key="catchItem.id"
              class="catch-form-row"
              :class="{ 'catch-form-row-custom': catchItem.species === 'other' }"
            >
              <select v-model="catchItem.species" :aria-label="`Species for catch ${index + 1}`">
                <option value="">Select a species</option>
                <option v-for="fish in ontarioFishSpecies" :key="fish" :value="fish">{{ fish }}</option>
                <option value="other">Other — enter a species</option>
              </select>
              <input
                v-if="catchItem.species === 'other'"
                v-model="catchItem.customSpecies"
                :aria-label="`Custom species name for catch ${index + 1}`"
                placeholder="Species name"
                maxlength="60"
              >
              <input v-model.number="catchItem.quantity" :aria-label="`Quantity for catch ${index + 1}`" type="number" min="1" max="999" required>
              <button
                v-if="catches.length > 1"
                class="remove-catch-button"
                type="button"
                :aria-label="`Remove catch ${index + 1}`"
                @click="removeCatch(catchItem.id)"
              >×</button>
            </div>
          </div>

          <div class="form-field form-field-full">
            <label for="trip-conditions">Conditions</label>
            <input id="trip-conditions" v-model="conditions" placeholder="Weather, temperature, water conditions…" maxlength="100">
          </div>
          <div class="form-field form-field-full">
            <label for="trip-notes">Trip notes</label>
            <textarea id="trip-notes" v-model="notes" placeholder="The good bits, what worked, what you might try next time…" maxlength="1000" />
          </div>

          <div class="form-field form-field-full">
            <label for="trip-photos">Trip photos</label>
            <input id="trip-photos" type="file" accept="image/*" disabled aria-describedby="trip-photos-status">
            <p id="trip-photos-status" class="photo-status">Photo uploads are temporarily unavailable.</p>
          </div>
        </div>
        <div class="form-actions">
          <button class="cancel-button" type="button" :disabled="saving" @click="emit('close')">Cancel</button>
          <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving trip…' : 'Save to diary' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.catch-form-heading { align-items: center; display: flex; justify-content: space-between; }
.catch-form-heading label span,.form-field > label span { color: #98a39c; font-size: 10px; font-weight: 400; }
.catch-form-row { align-items: center; display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) 96px 30px; margin-top: 8px; }
.catch-form-row select,.catch-form-row input { min-width: 0; }
.catch-form-row-custom select { grid-column: 1/-1; }
.catch-form-row-custom input:not([type="number"]) { grid-column: 1; }
.catch-form-row-custom input[type="number"] { grid-column: 2; }
.remove-catch-button { align-items: center; background: #f6f7f4; border: 1px solid #e5e9e3; border-radius: 7px; color: #78857d; display: flex; font-size: 17px; height: 34px; justify-content: center; }
.photo-status { color: #89958e; font-size: 10px; margin: 7px 0 0; }
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 11px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
@media (max-width: 500px) {
  .catch-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 70px 28px; }
}
</style>
