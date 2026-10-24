<script setup lang="ts">
import type { FishingLure, TackleboxLure } from '../composables/useFishingData'
import type { TripLureDraft } from '../types/tripLureDraft'

interface QuickAddLure {
  key: string
  name: string
  brand: string
  type: string
  color: string
  notes: string
  inventoryLureId?: string
}

const props = defineProps<{
  lures: TripLureDraft[]
  previousLures: FishingLure[]
  tackleboxLures: TackleboxLure[]
  loading?: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [id: number]
  addSaved: [lure: { name: string; notes: string; inventoryLureId?: string }]
}>()

const query = ref('')
const pickerOpen = ref(false)
const picker = ref<HTMLElement | null>(null)

// Combines saved and previously used lures by name; returns sorted quick-add choices.
const quickAddLures = computed<QuickAddLure[]>(() => {
  const luresByName = new Map<string, QuickAddLure>()

  for (const lure of props.previousLures) {
    const name = lure.name.trim()
    if (!name) continue
    const key = name.toLocaleLowerCase()
    luresByName.set(key, { key, name, brand: '', type: '', color: '', notes: lure.notes })
  }

  for (const lure of props.tackleboxLures) {
    const key = lure.name.trim().toLocaleLowerCase()
    luresByName.set(key, {
      key,
      name: lure.name,
      brand: lure.brand,
      type: lure.type,
      color: lure.color,
      notes: lure.notes,
      inventoryLureId: lure.id
    })
  }

  return [...luresByName.values()].sort((a, b) => a.name.localeCompare(b.name))
})

// Filters quick-add lure choices by the search query; returns matching lure records.
const filteredQuickAddLures = computed(() => {
  const search = query.value.trim().toLocaleLowerCase()
  return quickAddLures.value.filter(lure =>
    `${lure.name} ${lure.brand} ${lure.type} ${lure.color}`.toLocaleLowerCase().includes(search)
  )
})

// Checks whether a lure already appears in the trip draft by inventory ID or normalized name.
function isLureAdded(lure: QuickAddLure) {
  return props.lures.some(item =>
    (lure.inventoryLureId && item.inventoryLureId === lure.inventoryLureId) ||
    item.name.trim().toLocaleLowerCase() === lure.name.trim().toLocaleLowerCase()
  )
}

// Requests that the parent add a selected saved or previously used lure to the trip draft.
function addSavedLure(lure: QuickAddLure) {
  emit('addSaved', {
    name: lure.name,
    notes: '',
    ...(lure.inventoryLureId ? { inventoryLureId: lure.inventoryLureId } : {})
  })
}

// Closes the saved-lure results when a pointer event occurs outside the picker.
function closePickerOnOutsideClick(event: PointerEvent) {
  if (!(event.target instanceof Node)) return
  if (!picker.value?.contains(event.target)) pickerOpen.value = false
}

onMounted(() => document.addEventListener('pointerdown', closePickerOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closePickerOnOutsideClick))
</script>

<template>
  <div class="form-field form-field-full">
    <div class="catch-form-heading">
      <label>Lures <span>(optional)</span></label>
      <button class="text-button" type="button" @click="emit('add')">＋ Add a lure</button>
    </div>
    <div v-if="quickAddLures.length" ref="picker" class="saved-lure-picker">
      <span class="saved-lure-label">Quick add a saved or previously used lure</span>
      <div class="saved-lure-search">
        <span aria-hidden="true">⌕</span>
        <input
          v-model="query"
          type="search"
          aria-label="Search saved and previously used lures"
          aria-controls="saved-lure-results"
          :aria-expanded="pickerOpen"
          placeholder="Search lures…"
          @focus="pickerOpen = true"
          @keydown.esc="pickerOpen = false"
        >
        <button
          v-if="query"
          class="saved-lure-clear"
          type="button"
          aria-label="Clear lure search"
          @click="query = ''; pickerOpen = true"
        >×</button>
        <div v-if="pickerOpen" id="saved-lure-results" class="saved-lure-results" role="listbox" aria-label="Saved and previously used lures">
          <button
            v-for="lure in filteredQuickAddLures"
            :key="lure.key"
            class="saved-lure-option"
            :class="{ 'saved-lure-option-added': isLureAdded(lure) }"
            type="button"
            role="option"
            :aria-selected="isLureAdded(lure)"
            @click="addSavedLure(lure)"
          >
            <span class="saved-lure-option-icon" aria-hidden="true">{{ isLureAdded(lure) ? '✓' : '＋' }}</span>
            <span class="saved-lure-option-copy">
              <strong>{{ lure.name }}</strong>
              <span>{{ [lure.brand, lure.type, lure.color].filter(Boolean).join(' · ') || 'Previously used lure' }}</span>
            </span>
            <span v-if="isLureAdded(lure)" class="saved-lure-added">Added</span>
          </button>
          <p v-if="!filteredQuickAddLures.length" class="saved-lure-empty">No lures match that search.</p>
        </div>
      </div>
    </div>
    <p v-else-if="loading" class="photo-status">Loading your saved lures…</p>
    <p v-else class="photo-status">
      No saved or previously used lures yet.
      <NuxtLink to="/tacklebox">Add a lure to your tacklebox</NuxtLink> or enter one below.
    </p>
    <p v-if="quickAddLures.length" class="photo-status">Tap a lure to add it to this trip, or enter another one below.</p>
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
        @click="emit('remove', lure.id)"
      >×</button>
    </div>
  </div>
</template>

<style scoped>
.catch-form-heading { align-items: center; display: flex; justify-content: space-between; }
.catch-form-heading label span { color: #69776e; font-size: 12px; font-weight: 400; }
.saved-lure-picker { display: grid; gap: 6px; margin-top: 10px; }
.saved-lure-label { color: #7e8b83; font-size: 12px; }
.photo-status a { color: #477353; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.saved-lure-search { align-items: center; background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #89958e; display: flex; gap: 8px; padding: 0 9px; position: relative; }
.saved-lure-search:focus-within { border-color: #87a88c; box-shadow: 0 0 0 3px #eaf2eb; }
.saved-lure-search > span { font-size: 17px; line-height: 1; }
.saved-lure-search input { background: transparent; border: 0; color: #34433a; flex: 1; font-size: 12px; height: 36px; min-width: 0; outline: 0; padding: 0; }
.saved-lure-clear { background: transparent; border: 0; color: #89958e; font-size: 17px; padding: 3px; }
.saved-lure-results { background: #fff; border: 1px solid #e1e8e0; border-radius: 8px; box-shadow: 0 8px 22px #1938271c; left: 0; max-height: 190px; overflow-y: auto; padding: 4px; position: absolute; right: 0; top: calc(100% + 5px); z-index: 20; }
.saved-lure-option { align-items: center; background: transparent; border: 0; border-radius: 6px; color: #425148; display: flex; gap: 8px; min-height: 42px; padding: 6px 8px; text-align: left; width: 100%; }
.saved-lure-option:hover { background: #edf5ed; }
.saved-lure-option-added { background: #f5f8f4; }
.saved-lure-option-icon { align-items: center; background: #eaf2ec; border-radius: 6px; color: #54795d; display: flex; flex: 0 0 27px; height: 27px; justify-content: center; }
.saved-lure-option-copy { display: grid; gap: 3px; min-width: 0; }
.saved-lure-option-copy strong { color: #425148; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-lure-option-copy span { color: #8d9992; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-lure-added { color: #7a8980; font-size: 12px; }
.saved-lure-empty { color: #89958e; font-size: 12px; margin: 0; padding: 11px 9px; }
.lure-form-row { align-items: center; display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) minmax(0,1fr) 30px; margin-top: 8px; }
.lure-form-row input { min-width: 0; }
.photo-status { color: #89958e; font-size: 12px; margin: 7px 0 0; }
.remove-catch-button { align-items: center; background: #f6f7f4; border: 1px solid #e5e9e3; border-radius: 7px; color: #78857d; display: flex; font-size: 17px; height: 40px; justify-content: center; }
@media (max-width: 500px) {
  .lure-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 36px; }
  .lure-form-row input { min-height: 44px; }
  .lure-form-row input:nth-child(2) { grid-column: 1; }
  .lure-form-row .remove-catch-button { grid-column: 2; grid-row: 1 / span 2; }
  .saved-lure-option { min-height: 44px; }
  .remove-catch-button { height: 44px; }
}
</style>
