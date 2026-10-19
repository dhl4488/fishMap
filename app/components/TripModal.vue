<script setup lang="ts">
import type { FishingCombo, FishingTrip } from '../composables/useFishingData'
import { ontarioFishSpecies } from '../data/ontarioFishSpecies'

interface CatchDraft {
  id: number
  species: string
  customSpecies: string
  quantity: number
}

interface LureDraft {
  id: number
  name: string
  notes: string
}

const props = defineProps<{
  modelValue: boolean
  trip?: FishingTrip | null
  combos: FishingCombo[]
  saving?: boolean
  saveError?: string | null
  savingCombo?: boolean
  comboSaveError?: string | null
  comboSaveSuccess?: string | null
}>()
const emit = defineEmits<{
  close: []
  save: [trip: Omit<FishingTrip, 'id'>, photos: File[]]
  saveCombo: [combo: Omit<FishingCombo, 'id'>]
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
const lures = ref<LureDraft[]>([])
const nextLureId = ref(0)
const conditions = ref('')
const hook = ref('')
const line = ref('')
const weight = ref('')
const waterDepth = ref('')
const notes = ref('')
const selectedComboId = ref('')
const comboName = ref('')
const comboActionError = ref('')

function newCatch(): CatchDraft {
  return { id: nextCatchId.value++, species: '', customSpecies: '', quantity: 1 }
}

function newLure(lure: { name: string; notes: string } = { name: '', notes: '' }): LureDraft {
  return { id: nextLureId.value++, ...lure }
}

function resetDraft(trip: FishingTrip | null = null) {
  location.value = trip?.location ?? ''
  catches.value = trip?.catches.length
    ? trip.catches.map((item) => {
        const isKnownSpecies = ontarioFishSpecies.some(species => species === item.species)
        return {
          ...newCatch(),
          species: isKnownSpecies ? item.species : 'other',
          customSpecies: isKnownSpecies ? '' : item.species,
          quantity: item.quantity
        }
      })
    : [newCatch()]
  date.value = trip?.date ?? today
  conditions.value = trip?.conditions ?? ''
  lures.value = trip?.lures?.map(lure => newLure(lure)) ?? []
  hook.value = trip?.hook ?? ''
  line.value = trip?.line ?? ''
  weight.value = trip?.weight ?? ''
  waterDepth.value = trip?.waterDepth ?? ''
  notes.value = trip?.notes ?? ''
  selectedComboId.value = ''
  comboName.value = ''
  comboActionError.value = ''
}

function addCatch() {
  catches.value.push(newCatch())
}

function removeCatch(id: number) {
  catches.value = catches.value.filter(item => item.id !== id)
}

function addLure() {
  lures.value.push(newLure())
}

function removeLure(id: number) {
  lures.value = lures.value.filter(lure => lure.id !== id)
}

function applySelectedCombo() {
  const combo = props.combos.find(item => item.id === selectedComboId.value)
  if (!combo) return

  lures.value = combo.lures.map(name => newLure({ name, notes: '' }))
  hook.value = combo.hook
  line.value = combo.line
  weight.value = combo.weight
}

function saveComboPreset() {
  comboActionError.value = ''
  const comboLures = lures.value.map(lure => lure.name.trim()).filter(Boolean)
  if (!hook.value.trim() && !line.value.trim() && !weight.value.trim() && !comboLures.length) {
    comboActionError.value = 'Add a lure, hook, line, or weight before saving a combo.'
    return
  }
  if (!comboName.value.trim()) {
    comboActionError.value = 'Enter a name for this combo preset.'
    return
  }

  emit('saveCombo', {
    name: comboName.value.trim(),
    lures: comboLures,
    hook: hook.value.trim(),
    line: line.value.trim(),
    weight: weight.value.trim()
  })
}

// Reset draft fields whenever the dialog opens so a new entry starts clean.
watch(() => [props.modelValue, props.trip] as const, ([isOpen, trip]) => {
  if (isOpen) resetDraft(trip ?? null)
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
    lures: lures.value
      .map(({ name, notes }) => ({ name: name.trim(), notes: notes.trim() }))
      .filter(lure => lure.name.length > 0),
    hook: hook.value.trim(),
    line: line.value.trim(),
    weight: weight.value.trim(),
    waterDepth: waterDepth.value.trim(),
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
            <p class="eyebrow">{{ trip ? 'EDIT YOUR ENTRY' : 'A NEW ENTRY' }}</p>
            <h2>{{ trip ? 'Edit fishing trip' : 'Log a fishing trip' }}</h2>
            <p>{{ trip ? 'Update the details from your day on the water.' : 'Hold on to the little details that make a day.' }}</p>
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
            <div v-if="combos.length" class="combo-picker">
              <label for="trip-combo">Quick-add a saved combo</label>
              <select id="trip-combo" v-model="selectedComboId" @change="applySelectedCombo">
                <option value="">Choose a combo preset</option>
                <option v-for="combo in combos" :key="combo.id" :value="combo.id">{{ combo.name }}</option>
              </select>
            </div>
            <div class="catch-form-heading">
              <label>Lures <span>(optional)</span></label>
              <button class="text-button" type="button" @click="addLure">＋ Add a lure</button>
            </div>
            <div v-for="(lure, index) in lures" :key="lure.id" class="lure-form-row">
              <input
                v-model="lure.name"
                :aria-label="`Lure ${index + 1} name`"
                placeholder="Lure name, e.g. spinnerbait"
                maxlength="80"
                required
              >
              <input
                v-model="lure.notes"
                :aria-label="`Notes for lure ${index + 1}`"
                placeholder="How did it perform?"
                maxlength="200"
              >
              <button
                class="remove-catch-button"
                type="button"
                :aria-label="`Remove lure ${index + 1}`"
                @click="removeLure(lure.id)"
              >×</button>
            </div>
          </div>
          <div class="form-field">
            <label for="trip-hook">Hook</label>
            <input id="trip-hook" v-model="hook" placeholder="e.g. size 2/0 circle hook" maxlength="80">
          </div>
          <div class="form-field">
            <label for="trip-line">Line</label>
            <input id="trip-line" v-model="line" placeholder="e.g. 10 lb fluorocarbon" maxlength="80">
          </div>
          <div class="form-field">
            <label for="trip-weight">Weight</label>
            <input id="trip-weight" v-model="weight" placeholder="e.g. 1/4 oz" maxlength="40">
          </div>
          <div class="form-field">
            <label for="trip-water-depth">Water depth</label>
            <input id="trip-water-depth" v-model="waterDepth" placeholder="e.g. 12 ft or 4 m" maxlength="40">
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
          <div class="form-field form-field-full combo-save">
            <label for="combo-name">Save this setup as a combo preset</label>
            <div class="combo-save-row">
              <input id="combo-name" v-model="comboName" placeholder="e.g. River walleye setup" maxlength="60">
              <button class="secondary-button" type="button" :disabled="savingCombo" @click="saveComboPreset">
                {{ savingCombo ? 'Saving…' : 'Save combo' }}
              </button>
            </div>
            <p v-if="comboActionError || comboSaveError" class="trip-save-error" role="alert">{{ comboActionError || comboSaveError }}</p>
            <p v-else-if="comboSaveSuccess" class="photo-status" role="status">{{ comboSaveSuccess }}</p>
          </div>
        </div>
        <div class="form-actions">
          <button class="cancel-button" type="button" :disabled="saving" @click="emit('close')">Cancel</button>
          <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving trip…' : trip ? 'Save changes' : 'Save to diary' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.catch-form-heading { align-items: center; display: flex; justify-content: space-between; }
.catch-form-heading label span,.form-field > label span { color: #98a39c; font-size: 10px; font-weight: 400; }
.combo-picker { display: grid; gap: 6px; margin-bottom: 12px; }
.combo-picker label,.combo-save > label { color: #58675e; font-size: 10px; font-weight: 600; }
.combo-save-row { align-items: center; display: flex; gap: 8px; }
.combo-save-row input { min-width: 0; }
.combo-save-row .secondary-button { flex: 0 0 auto; min-height: 38px; }
.combo-save .trip-save-error { margin: 0; }
.catch-form-row { align-items: center; display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) 96px 30px; margin-top: 8px; }
.catch-form-row select,.catch-form-row input { min-width: 0; }
.lure-form-row { align-items: center; display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) minmax(0,1fr) 30px; margin-top: 8px; }
.lure-form-row input { min-width: 0; }
.catch-form-row-custom select { grid-column: 1/-1; }
.catch-form-row-custom input:not([type="number"]) { grid-column: 1; }
.catch-form-row-custom input[type="number"] { grid-column: 2; }
.remove-catch-button { align-items: center; background: #f6f7f4; border: 1px solid #e5e9e3; border-radius: 7px; color: #78857d; display: flex; font-size: 17px; height: 34px; justify-content: center; }
.photo-status { color: #89958e; font-size: 10px; margin: 7px 0 0; }
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 11px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
@media (max-width: 500px) {
  .modal-backdrop { align-items: flex-start; overflow-y: auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
  .modal { border-radius: 12px; max-height: calc(100dvh - 24px); padding: 18px; }
  .modal-close { flex: 0 0 40px; height: 40px; width: 40px; }
  .catch-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 64px 36px; }
  .catch-form-row select,.catch-form-row input { min-height: 44px; }
  .lure-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 36px; }
  .lure-form-row input { min-height: 44px; }
  .lure-form-row input:nth-child(2) { grid-column: 1; }
  .lure-form-row .remove-catch-button { grid-column: 2; grid-row: 1 / span 2; }
  .combo-save-row { align-items: stretch; flex-direction: column; }
  .combo-save-row .secondary-button { min-height: 44px; }
  .remove-catch-button { height: 44px; }
  .form-actions > button { flex: 1; min-height: 44px; }
}
</style>
