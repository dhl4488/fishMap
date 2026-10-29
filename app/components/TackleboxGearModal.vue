<script setup lang="ts">
import type { TackleboxLure, TackleboxReel, TackleboxRod } from '../composables/useFishingData'
import { lureTypes, reelTypes, rodTypes } from '../utils/tackleboxGear'

type GearKind = 'lure' | 'rod' | 'reel'
type GearItem = TackleboxLure | TackleboxRod | TackleboxReel

const props = defineProps<{
  kind: GearKind
  initial?: GearItem | null
  initialName?: string
  editing?: boolean
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  'save-lure': [value: Omit<TackleboxLure, 'id'>]
  'save-rod': [value: Omit<TackleboxRod, 'id'>]
  'save-reel': [value: Omit<TackleboxReel, 'id'>]
}>()

const name = ref('')
const brand = ref('')
const type = ref('')
const color = ref('')
const size = ref('')
const notes = ref('')
const length = ref('')
const power = ref('')
const action = ref('')
const gearRatio = ref('')
const retrieve = ref('')
const validationError = ref('')

watch(() => [props.kind, props.initial, props.initialName] as const, () => {
  const initial = props.initial
  name.value = initial?.name ?? props.initialName ?? ''
  brand.value = initial?.brand ?? ''
  type.value = initial?.type ?? ''
  color.value = 'color' in (initial ?? {}) ? initial?.color ?? '' : ''
  size.value = 'size' in (initial ?? {}) ? initial?.size ?? '' : ''
  notes.value = initial?.notes ?? ''
  length.value = 'length' in (initial ?? {}) ? initial?.length ?? '' : ''
  power.value = 'power' in (initial ?? {}) ? initial?.power ?? '' : ''
  action.value = 'action' in (initial ?? {}) ? initial?.action ?? '' : ''
  gearRatio.value = 'gearRatio' in (initial ?? {}) ? initial?.gearRatio ?? '' : ''
  retrieve.value = 'retrieve' in (initial ?? {}) ? initial?.retrieve ?? '' : ''
  validationError.value = ''
}, { immediate: true })

function submit() {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    validationError.value = `Enter a ${props.kind} name.`
    return
  }

  validationError.value = ''
  if (props.kind === 'lure') {
    emit('save-lure', {
      name: trimmedName,
      brand: brand.value.trim(),
      type: type.value.trim(),
      color: color.value.trim(),
      size: size.value.trim(),
      notes: notes.value.trim()
    })
  } else if (props.kind === 'rod') {
    emit('save-rod', {
      name: trimmedName,
      brand: brand.value.trim(),
      type: type.value.trim(),
      length: length.value.trim(),
      power: power.value.trim(),
      action: action.value.trim(),
      notes: notes.value.trim()
    })
  } else {
    emit('save-reel', {
      name: trimmedName,
      brand: brand.value.trim(),
      type: type.value.trim(),
      size: size.value.trim(),
      gearRatio: gearRatio.value.trim(),
      retrieve: retrieve.value.trim(),
      notes: notes.value.trim()
    })
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <form class="modal gear-modal" :class="`${kind}-modal`" @submit.prevent="submit">
        <div class="modal-header">
          <div>
            <p class="eyebrow">{{ editing ? 'UPDATE YOUR TACKLEBOX' : 'ADD TO YOUR TACKLEBOX' }}</p>
            <h2>{{ editing ? `Edit ${kind}` : `Add a ${kind}` }}</h2>
            <p v-if="kind === 'lure'">Save details once, then select this lure when logging a trip.</p>
            <p v-else-if="kind === 'rod'">Save your setup once, then select it when logging a trip.</p>
            <p v-else>Save your reel specs for easy reference.</p>
          </div>
          <button class="modal-close" type="button" :aria-label="`Close ${kind} form`" :disabled="saving" @click="emit('close')">×</button>
        </div>
        <p v-if="error || validationError" class="trip-save-error" role="alert">{{ error || validationError }}</p>
        <div class="form-grid">
          <div class="form-field form-field-full">
            <label :for="`tackle-${kind}-name`">{{ kind === 'lure' ? 'Lure' : kind === 'rod' ? 'Rod' : 'Reel' }} name</label>
            <input :id="`tackle-${kind}-name`" v-model="name" :placeholder="kind === 'lure' ? 'e.g. X-Rap 10' : kind === 'rod' ? 'e.g. St. Croix Bass X' : 'e.g. Stradic 2500'" required :maxlength="kind === 'lure' ? 80 : 100">
          </div>
          <div class="form-field">
            <label :for="`tackle-${kind}-brand`">Brand</label>
            <input :id="`tackle-${kind}-brand`" v-model="brand" :placeholder="kind === 'lure' ? 'e.g. Rapala' : kind === 'rod' ? 'e.g. St. Croix' : 'e.g. Shimano'" maxlength="60">
          </div>
          <div class="form-field">
            <label :for="`tackle-${kind}-type`">{{ kind === 'lure' ? 'Lure' : kind === 'rod' ? 'Rod' : 'Reel' }} type</label>
            <select :id="`tackle-${kind}-type`" v-model="type">
              <option value="">Choose a type</option>
              <template v-if="kind === 'lure'">
                <option v-for="lureType in lureTypes" :key="lureType.value" :value="lureType.value">{{ lureType.value }}</option>
              </template>
              <template v-else-if="kind === 'rod'">
                <option v-for="rodType in rodTypes" :key="rodType.value" :value="rodType.value">{{ rodType.label }}</option>
              </template>
              <template v-else>
                <option v-for="reelType in reelTypes" :key="reelType.value" :value="reelType.value">{{ reelType.label }}</option>
              </template>
            </select>
          </div>
          <template v-if="kind === 'lure'">
            <div class="form-field">
              <label for="tackle-lure-color">Color / pattern</label>
              <input id="tackle-lure-color" v-model="color" placeholder="e.g. Perch, silver/blue" maxlength="60">
            </div>
            <div class="form-field">
              <label for="tackle-lure-size">Size / weight</label>
              <input id="tackle-lure-size" v-model="size" placeholder="e.g. 10 cm, 14 g" maxlength="50">
            </div>
          </template>
          <template v-else-if="kind === 'rod'">
            <div class="form-field">
              <label for="tackle-rod-length">Length</label>
              <input id="tackle-rod-length" v-model="length" placeholder="e.g. 6 ft 8 in" maxlength="30">
            </div>
            <div class="form-field">
              <label for="tackle-rod-power">Power</label>
              <input id="tackle-rod-power" v-model="power" placeholder="e.g. Medium-heavy" maxlength="40">
            </div>
            <div class="form-field form-field-full">
              <label for="tackle-rod-action">Action</label>
              <input id="tackle-rod-action" v-model="action" placeholder="e.g. Fast" maxlength="40">
            </div>
          </template>
          <template v-else>
            <div class="form-field">
              <label for="tackle-reel-size">Size</label>
              <input id="tackle-reel-size" v-model="size" placeholder="e.g. 2500" maxlength="30">
            </div>
            <div class="form-field">
              <label for="tackle-reel-gear-ratio">Gear ratio</label>
              <input id="tackle-reel-gear-ratio" v-model="gearRatio" placeholder="e.g. 6.2" maxlength="20">
            </div>
            <div class="form-field form-field-full">
              <label for="tackle-reel-retrieve">Retrieve</label>
              <input id="tackle-reel-retrieve" v-model="retrieve" placeholder="e.g. Left-hand, 35 in per turn" maxlength="50">
            </div>
          </template>
          <div class="form-field form-field-full">
            <label :for="`tackle-${kind}-photo`">Gear photo</label>
            <button :id="`tackle-${kind}-photo`" class="secondary-button" type="button" disabled :aria-describedby="`tackle-${kind}-photo-status`">Upload picture</button>
            <p :id="`tackle-${kind}-photo-status`" class="photo-upload-status">Picture uploads will be available when storage is ready.</p>
          </div>
          <div class="form-field form-field-full">
            <label :for="`tackle-${kind}-notes`">Notes <span style="color:#9aa59e;font-weight:400">(optional)</span></label>
            <textarea :id="`tackle-${kind}-notes`" v-model="notes" :placeholder="kind === 'lure' ? 'Diving depth, retrieve, hooks, or other reminders…' : kind === 'rod' ? 'Reel pairing, technique, or other reminders…' : 'Line capacity, drag, maintenance, or other reminders…'" maxlength="500" />
          </div>
        </div>
        <div class="form-actions">
          <button class="cancel-button" type="button" :disabled="saving" @click="emit('close')">Cancel</button>
          <button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : editing ? 'Save changes' : 'Add to tacklebox' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 12px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
.photo-upload-status { color: #89958e; font-size: 12px; margin: 0; }
.gear-modal { max-height: calc(100vh - 36px); overflow-y: auto; }
@media (max-width: 500px) {
  .modal-backdrop { align-items: flex-start; overflow-y: auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
  .modal { max-height: calc(100dvh - 24px); overflow-y: auto; }
}
</style>
