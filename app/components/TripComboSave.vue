<script setup lang="ts">
import type { FishingCombo } from '../composables/useFishingData'
import type { TripLureDraft } from '../types/tripLureDraft'

const props = defineProps<{
  lures: TripLureDraft[]
  hook: string
  line: string
  weight: string
  saving?: boolean
  saveError?: string | null
  saveSuccess?: string | null
}>()

const emit = defineEmits<{
  save: [combo: Omit<FishingCombo, 'id'>]
}>()

const comboName = defineModel<string>('comboName', { default: '' })
const actionError = defineModel<string>('actionError', { default: '' })

// Validates the current lure/rig details and emits them as a named combo preset.
function saveComboPreset() {
  actionError.value = ''
  const comboLures = props.lures.map(lure => lure.name.trim()).filter(Boolean)
  if (!props.hook.trim() && !props.line.trim() && !props.weight.trim() && !comboLures.length) {
    actionError.value = 'Add a lure, hook, line, or weight before saving a combo.'
    return
  }
  if (!comboName.value.trim()) {
    actionError.value = 'Enter a name for this combo preset.'
    return
  }

  emit('save', {
    name: comboName.value.trim(),
    lures: comboLures,
    hook: props.hook.trim(),
    line: props.line.trim(),
    weight: props.weight.trim()
  })
}
</script>

<template>
  <div class="form-field form-field-full combo-save">
    <label for="combo-name">Save this setup as a combo preset</label>
    <div class="combo-save-row">
      <input id="combo-name" v-model="comboName" placeholder="e.g. River walleye setup" maxlength="60">
      <button class="secondary-button" type="button" :disabled="saving" @click="saveComboPreset">
        {{ saving ? 'Saving…' : 'Save combo' }}
      </button>
    </div>
    <p v-if="actionError || saveError" class="trip-save-error" role="alert">{{ actionError || saveError }}</p>
    <p v-else-if="saveSuccess" class="photo-status" role="status">{{ saveSuccess }}</p>
  </div>
</template>

<style scoped>
.combo-save { display: grid; gap: 6px; }
.combo-save > label { color: #58675e; font-size: 12px; font-weight: 600; }
.combo-save-row { align-items: center; display: flex; gap: 8px; }
.combo-save-row input { min-width: 0; }
.combo-save-row .secondary-button { flex: 0 0 auto; min-height: 38px; }
.combo-save .trip-save-error { margin: 0; }
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 12px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
.photo-status { color: #89958e; font-size: 12px; margin: 7px 0 0; }
@media (max-width: 500px) {
  .combo-save-row { align-items: stretch; flex-direction: column; }
  .combo-save-row .secondary-button { min-height: 44px; }
}
</style>
