<script setup lang="ts">
import type { TackleboxReel, TackleboxRod } from '../composables/useFishingData'

const props = defineProps<{
  rods: TackleboxRod[]
  reels: TackleboxReel[]
}>()
const emit = defineEmits<{
  addRod: []
  addReel: []
}>()

const rodName = defineModel<string>('rodName', { default: '' })
const rodId = defineModel<string>('rodId', { default: '' })
const reelName = defineModel<string>('reelName', { default: '' })
const reelId = defineModel<string>('reelId', { default: '' })
const hook = defineModel<string>('hook', { default: '' })
const line = defineModel<string>('line', { default: '' })
const weight = defineModel<string>('weight', { default: '' })
const waterDepth = defineModel<string>('waterDepth', { default: '' })

// Selects a saved rod by ID; accepts an ID and synchronizes the selected rod name and ID.
function selectSavedRodById(id: string) {
  const rod = props.rods.find(item => item.id === id)
  rodId.value = rod?.id ?? ''
  rodName.value = rod?.name ?? ''
}

// Selects a saved reel by ID; accepts the ID and synchronizes the selected reel name and ID.
function selectSavedReelById(id: string) {
  const reel = props.reels.find(item => item.id === id)
  reelId.value = reel?.id ?? ''
  reelName.value = reel?.name ?? ''
}
</script>

<template>
  <div class="form-field form-field-full rod-field">
    <label for="trip-rod">Rod <span>(optional)</span></label>
    <div class="rod-picker">
      <select id="trip-rod" :value="rodId" @change="selectSavedRodById(($event.target as HTMLSelectElement).value)">
        <option value="">Choose a saved rod</option>
        <option v-for="rod in rods" :key="rod.id" :value="rod.id">
          {{ rod.name }}{{ rod.brand ? ` · ${rod.brand}` : '' }}
        </option>
      </select>
      <button class="text-button" type="button" @click="emit('addRod')">＋ Add a rod</button>
    </div>
  </div>
  <div class="form-field form-field-full rod-field">
    <label for="trip-reel">Reel <span>(optional)</span></label>
    <div class="rod-picker">
      <select id="trip-reel" :value="reelId" @change="selectSavedReelById(($event.target as HTMLSelectElement).value)">
        <option value="">Choose a saved reel</option>
        <option v-for="reel in reels" :key="reel.id" :value="reel.id">
          {{ reel.name }}{{ reel.brand ? ` · ${reel.brand}` : '' }}
        </option>
      </select>
      <button class="text-button" type="button" @click="emit('addReel')">＋ Add a reel</button>
    </div>
  </div>
  <div class="form-field">
    <label for="trip-hook">Separate hook / rig <span>(optional)</span></label>
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
</template>

<style scoped>
.rod-picker { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }
.rod-picker select { flex: 1 1 200px; min-width: 0; }
.rod-picker .text-button { flex: 0 0 auto; white-space: nowrap; }
</style>
