<script setup lang="ts">
import type { FishingCombo } from '../composables/useFishingData'

const props = defineProps<{
  combos: FishingCombo[]
}>()

const emit = defineEmits<{
  apply: [id: string]
}>()

const selectedComboId = defineModel<string>({ default: '' })

// Applies the currently selected combo by emitting its ID to the parent form.
function applySelectedCombo() {
  emit('apply', selectedComboId.value)
}
</script>

<template>
  <div v-if="combos.length" class="form-field form-field-full combo-picker">
    <label for="trip-combo">Quick-add a saved combo</label>
    <select id="trip-combo" v-model="selectedComboId" @change="applySelectedCombo">
      <option value="">Choose a combo preset</option>
      <option v-for="combo in combos" :key="combo.id" :value="combo.id">{{ combo.name }}</option>
    </select>
  </div>
</template>

<style scoped>
.combo-picker { display: grid; gap: 6px; margin-bottom: 12px; }
.combo-picker label { color: #58675e; font-size: 12px; font-weight: 600; }
</style>
