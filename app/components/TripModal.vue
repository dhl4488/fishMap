<script setup lang="ts">
import type { FishingCombo, FishingLure, FishingSpot, FishingTrip, TackleboxLure, TackleboxRod } from '../composables/useFishingData'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { ontarioFishSpecies } from '../data/ontarioFishSpecies'

interface CatchDraft {
  id: number
  species: string
  quantity: number
  lureId: number | ''
  individualDetails: boolean
  length: string
  weight: string
  releaseStatus: '' | 'released' | 'kept'
  photo?: string
  photoFile: File | null
  removePhoto: boolean
  photoError: string
}

interface LureDraft {
  id: number
  name: string
  notes: string
  inventoryLureId?: string
}

const props = defineProps<{
  modelValue: boolean
  trip?: FishingTrip | null
  combos: FishingCombo[]
  tackleboxLures: TackleboxLure[]
  tackleboxRods: TackleboxRod[]
  previousLures: FishingLure[]
  spots: FishingSpot[]
  spotsLoading?: boolean
  luresLoading?: boolean
  saving?: boolean
  saveError?: string | null
  offlineMode?: boolean
  savingCombo?: boolean
  comboSaveError?: string | null
  comboSaveSuccess?: string | null
}>()
const { isNative } = useNativeFeatures()
const emit = defineEmits<{
  close: []
  save: [trip: Omit<FishingTrip, 'id'>, photos: File[], catchPhotos: Array<File | null>]
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
const rodName = ref('')
const rodId = ref('')
const selectedComboId = ref('')
const comboName = ref('')
const comboActionError = ref('')
const savedSpotQuery = ref('')
const savedSpotPickerOpen = ref(false)
const savedSpotPicker = ref<HTMLElement | null>(null)
const savedLureQuery = ref('')
const savedLurePickerOpen = ref(false)
const savedLurePicker = ref<HTMLElement | null>(null)
const hasRecordedCatches = computed(() => catches.value.some(({ species }) => species.trim().length > 0))
const filteredSavedSpots = computed(() => {
  const query = savedSpotQuery.value.trim().toLocaleLowerCase()
  return props.spots.filter((spot) =>
    `${spot.name} ${spot.water} ${spot.kind}`.toLocaleLowerCase().includes(query)
  )
})
const filteredQuickAddLures = computed(() => {
  const query = savedLureQuery.value.trim().toLocaleLowerCase()
  return quickAddLures.value.filter((lure) =>
    `${lure.name} ${lure.brand} ${lure.type ?? ''} ${lure.color}`.toLocaleLowerCase().includes(query)
  )
})
const quickAddLures = computed(() => {
  const luresByName = new Map<string, {
    key: string
    name: string
    brand: string
    type: string
    color: string
    notes: string
    inventoryLureId?: string
  }>()

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

function newCatch(): CatchDraft {
  return {
    id: nextCatchId.value++,
    species: '',
    quantity: 1,
    lureId: '',
    individualDetails: false,
    length: '',
    weight: '',
    releaseStatus: '',
    photoFile: null,
    removePhoto: false,
    photoError: ''
  }
}

function newLure(lure: { name: string; notes: string; inventoryLureId?: string } = { name: '', notes: '' }): LureDraft {
  return { id: nextLureId.value++, ...lure }
}

function resetDraft(trip: FishingTrip | null = null) {
  location.value = trip?.location ?? ''
  lures.value = trip?.lures?.map((lure) => {
    const inventoryLure = props.tackleboxLures.find(item =>
      item.id === lure.inventoryLureId || item.name.trim().toLocaleLowerCase() === lure.name.trim().toLocaleLowerCase()
    )
    return newLure({ ...lure, inventoryLureId: lure.inventoryLureId ?? inventoryLure?.id })
  }) ?? []
  catches.value = trip?.catches.length
    ? trip.catches.map((item) => {
        return {
          ...newCatch(),
          species: item.species,
          quantity: item.quantity,
          individualDetails: item.length !== undefined || item.weight !== undefined || item.released !== undefined || item.photo !== undefined,
          length: item.length ?? '',
          weight: item.weight ?? '',
          releaseStatus: item.released === undefined ? '' : item.released ? 'released' : 'kept',
          photo: item.photo,
          lureId: lures.value.find(lure =>
            (item.lureId && lure.inventoryLureId === item.lureId) || lure.name === item.lure
          )?.id ?? ''
        }
      })
    : [newCatch()]
  date.value = trip?.date ?? today
  conditions.value = trip?.conditions ?? ''
  hook.value = trip?.hook ?? ''
  line.value = trip?.line ?? ''
  weight.value = trip?.weight ?? ''
  waterDepth.value = trip?.waterDepth ?? ''
  notes.value = trip?.notes ?? ''
  rodName.value = trip?.rod ?? ''
  rodId.value = props.tackleboxRods.find(rod =>
    rod.id === trip?.rodId || (!trip?.rodId && rod.name.trim().toLocaleLowerCase() === trip?.rod?.trim().toLocaleLowerCase())
  )?.id ?? ''
  selectedComboId.value = ''
  comboName.value = ''
  comboActionError.value = ''
}

function addCatch() {
  catches.value.push(newCatch())
}

function toggleCatchDetails(catchItem: CatchDraft) {
  catchItem.individualDetails = !catchItem.individualDetails
  if (catchItem.individualDetails) catchItem.quantity = 1
}

async function captureCatchPhoto(catchItem: CatchDraft) {
  catchItem.photoError = ''
  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt
    })
    if (!photo.webPath) throw new Error('The selected photo could not be opened.')
    const response = await fetch(photo.webPath)
    if (!response.ok) throw new Error('The selected photo could not be read.')
    const blob = await response.blob()
    const type = blob.type || 'image/jpeg'
    const extension = photo.format || (type === 'image/png' ? 'png' : 'jpg')
    catchItem.photoFile = new File([blob], `catch-${Date.now()}.${extension}`, { type })
    catchItem.removePhoto = false
  } catch (error) {
    if (error instanceof Error && /cancel(l)?ed|no image selected/i.test(error.message)) return
    console.error('Could not take or select a catch photo.', error)
    catchItem.photoError = error instanceof Error ? error.message : 'Could not open the camera or photo library.'
  }
}

function removeCatchPhoto(catchItem: CatchDraft, event: MouseEvent) {
  const button = event.currentTarget
  if (button instanceof HTMLButtonElement) {
    const photoInput = button.closest('.individual-catch-details')?.querySelector<HTMLInputElement>('input[type="file"]')
    if (photoInput) photoInput.value = ''
  }
  catchItem.photoFile = null
  catchItem.photo = undefined
  catchItem.removePhoto = true
  catchItem.photoError = ''
}

function selectSavedSpot(spot: FishingSpot) {
  location.value = spot.name
  savedSpotQuery.value = ''
  savedSpotPickerOpen.value = false
}

function selectSavedRodById(id: string) {
  const rod = props.tackleboxRods.find(item => item.id === id)
  rodId.value = rod?.id ?? ''
  if (rod) rodName.value = rod.name
}

function updateRodName(value: string) {
  rodName.value = value
  const selectedRod = props.tackleboxRods.find(rod => rod.id === rodId.value)
  if (!selectedRod || selectedRod.name.trim() !== value.trim()) rodId.value = ''
}

function closeSavedSpotPickerOnOutsideClick(event: PointerEvent) {
  if (!(event.target instanceof Node)) return
  if (!savedSpotPicker.value?.contains(event.target)) {
    savedSpotPickerOpen.value = false
  }
  if (!savedLurePicker.value?.contains(event.target)) {
    savedLurePickerOpen.value = false
  }
}

function removeCatch(id: number) {
  catches.value = catches.value.filter(item => item.id !== id)
}

function addLure() {
  lures.value.push(newLure())
}

function isTackleboxLureAdded(lure: { name: string; inventoryLureId?: string }) {
  return lures.value.some(item =>
    (lure.inventoryLureId && item.inventoryLureId === lure.inventoryLureId) ||
    item.name.trim().toLocaleLowerCase() === lure.name.trim().toLocaleLowerCase()
  )
}

function addPreviousLure(lure: { name: string; notes: string; inventoryLureId?: string }) {
  if (!isTackleboxLureAdded(lure)) {
    lures.value.push(newLure({
      name: lure.name,
      notes: '',
      ...(lure.inventoryLureId ? { inventoryLureId: lure.inventoryLureId } : {})
    }))
  }
}

function removeLure(id: number) {
  lures.value = lures.value.filter(lure => lure.id !== id)
  catches.value = catches.value.map(catchItem =>
    catchItem.lureId === id ? { ...catchItem, lureId: '' } : catchItem
  )
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
  if (isOpen) {
    resetDraft(trip ?? null)
    savedSpotQuery.value = ''
    savedSpotPickerOpen.value = false
    savedLureQuery.value = ''
    savedLurePickerOpen.value = false
  }
})

onMounted(() => document.addEventListener('pointerdown', closeSavedSpotPickerOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeSavedSpotPickerOnOutsideClick))

function submitTrip() {
  const validCatchDrafts = catches.value.filter(item => item.species.trim().length > 0)
  const tripCatches = validCatchDrafts
    .map((catchItem) => {
      const { species, quantity, lureId } = catchItem
      const lure = lures.value.find(item => item.id === lureId)?.name.trim()
      return {
        species: species.trim(),
        quantity: catchItem.individualDetails ? 1 : quantity,
        ...(lure ? { lure } : {}),
        ...(lures.value.find(item => item.id === lureId)?.inventoryLureId
          ? { lureId: lures.value.find(item => item.id === lureId)?.inventoryLureId }
          : {}),
        ...(catchItem.individualDetails && catchItem.length.trim() ? { length: catchItem.length.trim() } : {}),
        ...(catchItem.individualDetails && catchItem.weight.trim() ? { weight: catchItem.weight.trim() } : {}),
        ...(catchItem.individualDetails && catchItem.releaseStatus
          ? { released: catchItem.releaseStatus === 'released' }
          : {}),
        ...(catchItem.individualDetails && !catchItem.removePhoto && catchItem.photo
          ? { photo: catchItem.photo }
          : {})
      }
    })
  const catchPhotoFiles = validCatchDrafts.map(item => item.individualDetails ? item.photoFile : null)

  emit('save', {
    date: date.value,
    location: location.value.trim(),
    catches: tripCatches,
    conditions: conditions.value.trim(),
    lures: lures.value
      .map(({ name, notes, inventoryLureId }) => ({
        name: name.trim(),
        notes: notes.trim(),
        ...(inventoryLureId ? { inventoryLureId } : {})
      }))
      .filter(lure => lure.name.length > 0),
    hook: hook.value.trim(),
    line: line.value.trim(),
    weight: weight.value.trim(),
    waterDepth: waterDepth.value.trim(),
    rod: rodName.value.trim(),
    ...(rodId.value ? { rodId: rodId.value } : {}),
    notes: notes.value.trim()
  }, [], catchPhotoFiles)
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
        <p v-if="offlineMode" class="offline-save-note" role="status">
          <template v-if="trip">Existing trips can't be edited offline. Cancel and log a new trip to save it on this device for syncing later.</template>
          <template v-else>You're offline. This trip and its catch photos will be saved on this device and uploaded when you're connected again.</template>
        </p>
        <div class="form-grid">
          <div class="form-field">
            <label for="trip-date">Date</label>
            <input id="trip-date" v-model="date" type="date" required>
          </div>
          <div class="form-field">
            <label for="trip-location">Where did you fish?</label>
            <input id="trip-location" v-model="location" placeholder="e.g. Grand River near Paris" required maxlength="80">
          </div>
          <div v-if="spots.length || spotsLoading" ref="savedSpotPicker" class="form-field form-field-full saved-spot-field">
            <label>Quick add a saved spot <span>(optional)</span></label>
            <p class="saved-spot-hint">Choose a spot to fill in the location. You can edit it afterward.</p>
            <div v-if="spots.length" class="saved-spot-search">
              <span aria-hidden="true">⌕</span>
              <input
                v-model="savedSpotQuery"
                type="search"
                aria-label="Search saved spots"
                aria-controls="saved-spot-results"
                :aria-expanded="savedSpotPickerOpen"
                placeholder="Search saved spots…"
                @focus="savedSpotPickerOpen = true"
                @keydown.esc="savedSpotPickerOpen = false"
              >
              <button
                v-if="savedSpotQuery"
                class="saved-spot-clear"
                type="button"
                aria-label="Clear saved spot search"
                @click="savedSpotQuery = ''; savedSpotPickerOpen = true"
              >×</button>
              <div v-if="savedSpotPickerOpen" id="saved-spot-results" class="saved-spot-results" role="listbox" aria-label="Saved spots">
                <button
                  v-for="spot in filteredSavedSpots"
                  :key="spot.id"
                  class="saved-spot-option"
                  :class="{ 'saved-spot-option-active': location === spot.name }"
                  type="button"
                  role="option"
                  :aria-selected="location === spot.name"
                  @click="selectSavedSpot(spot)"
                >
                  <span class="saved-spot-pin" aria-hidden="true">⌖</span>
                  <span class="saved-spot-copy">
                    <strong>{{ spot.name }}</strong>
                    <span>{{ spot.water }} · {{ spot.kind.split(' · ').at(-1) }}</span>
                  </span>
                  <span v-if="location === spot.name" class="saved-spot-selected">Selected</span>
                </button>
                <p v-if="!filteredSavedSpots.length" class="saved-spot-empty">No saved spots match that search.</p>
              </div>
            </div>
            <p v-else class="photo-status">Loading your saved spots…</p>
          </div>

          <div class="form-field form-field-full">
            <div class="catch-form-heading">
              <label>Your catches <span>(optional)</span></label>
              <button class="text-button" type="button" @click="addCatch">＋ Add a species</button>
            </div>
            <p class="photo-status">Type to search the species list, or enter a species name.</p>
            <p v-if="!hasRecordedCatches" class="photo-status">No catches? Better luck next time!</p>
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
                @click="removeCatch(catchItem.id)"
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
                  @click="toggleCatchDetails(catchItem)"
                >{{ catchItem.individualDetails ? '− Hide fish details' : '＋ Add individual fish details' }}</button>
                <span v-if="catchItem.individualDetails" class="photo-status">Detailed entry counts as one fish.</span>
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
                    <button class="native-photo-button" type="button" @click="captureCatchPhoto(catchItem)">
                      {{ isNative ? 'Take or choose a photo' : 'Choose a photo' }}
                    </button>
                  </div>
                </div>
                <p v-if="catchItem.photoError" class="catch-photo-error" role="alert">{{ catchItem.photoError }}</p>
                <div v-if="catchItem.photoFile || catchItem.photo" class="catch-photo-status">
                  <span>{{ catchItem.photoFile?.name ?? 'A fish photo is saved' }}</span>
                  <button class="text-button" type="button" @click="removeCatchPhoto(catchItem, $event)">Remove photo</button>
                </div>
              </div>
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
            <div v-if="quickAddLures.length" ref="savedLurePicker" class="saved-lure-picker">
              <span class="saved-lure-label">Quick add a saved or previously used lure</span>
              <div class="saved-lure-search">
                <span aria-hidden="true">⌕</span>
                <input
                  v-model="savedLureQuery"
                  type="search"
                  aria-label="Search saved and previously used lures"
                  aria-controls="saved-lure-results"
                  :aria-expanded="savedLurePickerOpen"
                  placeholder="Search lures…"
                  @focus="savedLurePickerOpen = true"
                  @keydown.esc="savedLurePickerOpen = false"
                >
                <button
                  v-if="savedLureQuery"
                  class="saved-lure-clear"
                  type="button"
                  aria-label="Clear lure search"
                  @click="savedLureQuery = ''; savedLurePickerOpen = true"
                >×</button>
                <div v-if="savedLurePickerOpen" id="saved-lure-results" class="saved-lure-results" role="listbox" aria-label="Saved and previously used lures">
                  <button
                    v-for="lure in filteredQuickAddLures"
                    :key="lure.key"
                    class="saved-lure-option"
                    :class="{ 'saved-lure-option-added': isTackleboxLureAdded(lure) }"
                    type="button"
                    role="option"
                    :aria-selected="isTackleboxLureAdded(lure)"
                    @click="addPreviousLure(lure)"
                  >
                    <span class="saved-lure-option-icon" aria-hidden="true">{{ isTackleboxLureAdded(lure) ? '✓' : '＋' }}</span>
                    <span class="saved-lure-option-copy">
                      <strong>{{ lure.name }}</strong>
                      <span>{{ [lure.brand, lure.type, lure.color].filter(Boolean).join(' · ') || 'Previously used lure' }}</span>
                    </span>
                    <span v-if="isTackleboxLureAdded(lure)" class="saved-lure-added">Added</span>
                  </button>
                  <p v-if="!filteredQuickAddLures.length" class="saved-lure-empty">No lures match that search.</p>
                </div>
              </div>
            </div>
            <p v-else-if="luresLoading" class="photo-status">Loading your saved lures…</p>
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
                @click="removeLure(lure.id)"
              >×</button>
            </div>
          </div>
          <div class="form-field form-field-full rod-field">
            <label for="trip-rod">Rod <span>(optional)</span></label>
            <div class="rod-picker">
              <select id="trip-rod" :value="rodId" @change="selectSavedRodById(($event.target as HTMLSelectElement).value)">
                <option value="">Choose a saved rod</option>
                <option v-for="rod in tackleboxRods" :key="rod.id" :value="rod.id">
                  {{ rod.name }}{{ rod.brand ? ` · ${rod.brand}` : '' }}
                </option>
              </select>
              <NuxtLink to="/tacklebox" class="rod-manage-link">Manage rods</NuxtLink>
            </div>
            <input
              :value="rodName"
              aria-label="Rod name used on this trip"
              placeholder="Or enter a rod name"
              maxlength="100"
              @input="updateRodName(($event.target as HTMLInputElement).value)"
            >
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
          <button class="primary-button" type="submit" :disabled="saving || (offlineMode && !!trip)">{{ saving ? 'Saving trip…' : offlineMode && trip ? 'Reconnect to save' : trip ? 'Save changes' : 'Save to diary' }}</button>
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
.catch-form-row .catch-setup-select { grid-column: 1/-1; }
.catch-form-row > input:disabled { background: #f4f6f2; color: #77847c; }
.catch-detail-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; grid-column: 1/-1; }
.individual-catch-details { background: #f8faf7; border: 1px solid #edf1eb; border-radius: 8px; grid-column: 1/-1; padding: 10px; }
.individual-catch-fields { display: grid; gap: 9px; grid-template-columns: repeat(2, minmax(0,1fr)); }
.individual-catch-fields label,.catch-photo-field { color: #69776e; display: grid; font-size: 10px; gap: 5px; min-width: 0; }
.individual-catch-fields input,.individual-catch-fields select { min-width: 0; width: 100%; }
.individual-catch-fields input[type="file"] { font-size: 9px; padding: 7px; }
.native-photo-button { background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #536158; font-size: 10px; min-height: 38px; padding: 7px 9px; text-align: left; }
.native-photo-button:hover { border-color: #a6b9a8; }
.catch-photo-error { color: #985b45; font-size: 9px; margin: 7px 0 0; }
.catch-photo-status { align-items: center; color: #718078; display: flex; flex-wrap: wrap; font-size: 9px; gap: 8px; justify-content: space-between; margin-top: 8px; overflow-wrap: anywhere; }
.lure-form-row { align-items: center; display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) minmax(0,1fr) 30px; margin-top: 8px; }
.lure-form-row input { min-width: 0; }
.saved-lure-picker { display: grid; gap: 6px; margin-top: 10px; }
.saved-lure-label { color: #7e8b83; font-size: 10px; }
.saved-lure-picker + .photo-status a,.photo-status a { color: #477353; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.saved-lure-search { align-items: center; background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #89958e; display: flex; gap: 8px; padding: 0 9px; position: relative; }
.saved-lure-search:focus-within { border-color: #87a88c; box-shadow: 0 0 0 3px #eaf2eb; }
.saved-lure-search > span { font-size: 17px; line-height: 1; }
.saved-lure-search input { background: transparent; border: 0; color: #34433a; flex: 1; font-size: 11px; height: 36px; min-width: 0; outline: 0; padding: 0; }
.saved-lure-clear { background: transparent; border: 0; color: #89958e; font-size: 17px; padding: 3px; }
.saved-lure-results { background: #fff; border: 1px solid #e1e8e0; border-radius: 8px; box-shadow: 0 8px 22px #1938271c; left: 0; max-height: 190px; overflow-y: auto; padding: 4px; position: absolute; right: 0; top: calc(100% + 5px); z-index: 20; }
.saved-lure-option { align-items: center; background: transparent; border: 0; border-radius: 6px; color: #425148; display: flex; gap: 8px; min-height: 42px; padding: 6px 8px; text-align: left; width: 100%; }
.saved-lure-option:hover { background: #edf5ed; }
.saved-lure-option-added { background: #f5f8f4; }
.saved-lure-option-icon { align-items: center; background: #eaf2ec; border-radius: 6px; color: #54795d; display: flex; flex: 0 0 27px; height: 27px; justify-content: center; }
.saved-lure-option-copy { display: grid; gap: 3px; min-width: 0; }
.saved-lure-option-copy strong { color: #425148; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-lure-option-copy span { color: #8d9992; font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-lure-added { color: #7a8980; font-size: 9px; }
.saved-lure-empty { color: #89958e; font-size: 10px; margin: 0; padding: 11px 9px; }
.saved-spot-field { background: #f8faf7; border: 1px solid #edf1eb; border-radius: 9px; gap: 5px; padding: 10px 11px; }
.saved-spot-field > label span { color: #98a39c; font-size: 10px; font-weight: 400; }
.saved-spot-hint { color: #89958e; font-size: 10px; line-height: 1.4; margin: 0; }
.saved-spot-search { align-items: center; background: #fff; border: 1px solid #e3e8e2; border-radius: 7px; color: #89958e; display: flex; gap: 8px; margin-top: 3px; padding: 0 9px; position: relative; }
.saved-spot-search:focus-within { border-color: #87a88c; box-shadow: 0 0 0 3px #eaf2eb; }
.saved-spot-search > span { font-size: 17px; line-height: 1; }
.saved-spot-search input { background: transparent; border: 0; color: #34433a; flex: 1; font-size: 11px; height: 36px; min-width: 0; outline: 0; padding: 0; }
.saved-spot-clear { background: transparent; border: 0; color: #89958e; font-size: 17px; padding: 3px; }
.saved-spot-results { background: #fff; border: 1px solid #e1e8e0; border-radius: 8px; box-shadow: 0 8px 22px #1938271c; left: 0; max-height: 190px; overflow-y: auto; padding: 4px; position: absolute; right: 0; top: calc(100% + 5px); z-index: 20; }
.saved-spot-option { align-items: center; background: transparent; border: 0; border-radius: 6px; color: #425148; display: flex; gap: 8px; min-height: 42px; padding: 6px 8px; text-align: left; width: 100%; }
.saved-spot-option:hover,.saved-spot-option-active { background: #edf5ed; }
.saved-spot-pin { align-items: center; background: #eaf2ec; border-radius: 6px; color: #54795d; display: flex; flex: 0 0 27px; height: 27px; justify-content: center; }
.saved-spot-copy { display: grid; gap: 3px; min-width: 0; }
.saved-spot-copy strong { color: #425148; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-spot-copy span { color: #8d9992; font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.saved-spot-selected { color: #54795d; font-size: 9px; margin-left: auto; white-space: nowrap; }
.saved-spot-empty { color: #89958e; font-size: 10px; margin: 0; padding: 11px 9px; }
.remove-catch-button { align-items: center; background: #f6f7f4; border: 1px solid #e5e9e3; border-radius: 7px; color: #78857d; display: flex; font-size: 17px; height: 34px; justify-content: center; }
.photo-status { color: #89958e; font-size: 10px; margin: 7px 0 0; }
.offline-save-note { background: #edf5ed; border-radius: 7px; color: #46694c; font-size: 10px; line-height: 1.5; margin: 0 0 14px; padding: 9px 11px; }
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 11px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
@media (max-width: 500px) {
  .modal-backdrop { align-items: flex-start; overflow-y: auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
  .modal { border-radius: 12px; max-height: calc(100dvh - 24px); padding: 18px; }
  .modal-close { flex: 0 0 40px; height: 40px; width: 40px; }
  .catch-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 64px 36px; }
  .catch-form-row select,.catch-form-row input { min-height: 44px; }
  .individual-catch-fields { grid-template-columns: minmax(0,1fr); }
  .individual-catch-fields input[type="file"] { min-height: 40px; }
  .lure-form-row { gap: 6px; grid-template-columns: minmax(0,1fr) 36px; }
  .lure-form-row input { min-height: 44px; }
  .lure-form-row input:nth-child(2) { grid-column: 1; }
  .lure-form-row .remove-catch-button { grid-column: 2; grid-row: 1 / span 2; }
  .saved-lure-option { min-height: 44px; }
  .saved-spot-option { min-height: 44px; }
  .combo-save-row { align-items: stretch; flex-direction: column; }
  .combo-save-row .secondary-button { min-height: 44px; }
  .remove-catch-button { height: 44px; }
  .form-actions > button { flex: 1; min-height: 44px; }
}
</style>
