<script setup lang="ts">
import type { FishingTrip } from '../composables/useFishingData'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  close: []
  save: [trip: Omit<FishingTrip, 'id'>]
}>()

function localDateString(date: Date) {
  // Offset before ISO formatting to preserve the calendar date in the user's timezone.
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

const today = localDateString(new Date())
const date = ref(today)
const location = ref('')
const species = ref('')
const quantity = ref(1)
const conditions = ref('')
const notes = ref('')

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    date.value = today
    location.value = ''
    species.value = ''
    quantity.value = 1
    conditions.value = ''
    notes.value = ''
  }
})

function submitTrip() {
  emit('save', {
    date: date.value,
    location: location.value.trim(),
    catches: species.value.trim() ? [{ species: species.value.trim(), quantity: quantity.value }] : [],
    conditions: conditions.value.trim(),
    notes: notes.value.trim()
  })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
      <form class="modal" @submit.prevent="submitTrip">
        <div class="modal-header">
          <div>
            <p class="eyebrow">A NEW ENTRY</p>
            <h2>Log a fishing trip</h2>
            <p>Hold on to the little details that make a day.</p>
          </div>
          <button class="modal-close" type="button" aria-label="Close dialog" @click="emit('close')">×</button>
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="trip-date">Date</label>
            <input id="trip-date" v-model="date" type="date" required>
          </div>
          <div class="form-field">
            <label for="trip-location">Where did you fish?</label>
            <input id="trip-location" v-model="location" placeholder="e.g. Willow Creek" required maxlength="80">
          </div>
          <div class="form-field">
            <label for="trip-species">What did you catch?</label>
            <input id="trip-species" v-model="species" placeholder="Species (optional)" maxlength="60">
          </div>
          <div class="form-field">
            <label for="trip-quantity">Number caught</label>
            <input id="trip-quantity" v-model.number="quantity" type="number" min="1" max="999" required>
          </div>
          <div class="form-field form-field-full">
            <label for="trip-conditions">Conditions</label>
            <input id="trip-conditions" v-model="conditions" placeholder="Weather, temperature, water conditions…" maxlength="100">
          </div>
          <div class="form-field form-field-full">
            <label for="trip-notes">Trip notes</label>
            <textarea id="trip-notes" v-model="notes" placeholder="The good bits, what worked, what you might try next time…" maxlength="1000" />
          </div>
        </div>
        <div class="form-actions">
          <button class="cancel-button" type="button" @click="emit('close')">Cancel</button>
          <button class="primary-button" type="submit">Save to diary</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
