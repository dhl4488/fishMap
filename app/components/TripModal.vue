<script setup lang="ts">
import type { FishingCombo, FishingLure, FishingSpot, FishingTrip, TackleboxLure, TackleboxReel, TackleboxRod } from '../composables/useFishingData'
import type { CatchDraft } from '../types/tripCatchDraft'
import type { TripLureDraft } from '../types/tripLureDraft'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

const props = defineProps<{
  modelValue: boolean
  trip?: FishingTrip | null
  combos: FishingCombo[]
  tackleboxLures: TackleboxLure[]
  tackleboxRods: TackleboxRod[]
  tackleboxReels: TackleboxReel[]
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

// Converts a date to a local YYYY-MM-DD value for the date input; returns a calendar-date string.
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
const lures = ref<TripLureDraft[]>([])
const nextLureId = ref(0)
const conditions = ref('')
const hook = ref('')
const line = ref('')
const weight = ref('')
const waterDepth = ref('')
const notes = ref('')
const rodName = ref('')
const rodId = ref('')
const reelName = ref('')
const reelId = ref('')
const selectedComboId = ref('')
const comboName = ref('')
const comboActionError = ref('')

// Creates a blank catch draft; takes no input and returns a draft with a unique local ID.
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

// Creates a lure draft from optional saved details; returns the draft with a unique local ID.
function newLure(lure: { name: string; notes: string; inventoryLureId?: string } = { name: '', notes: '' }): TripLureDraft {
  return { id: nextLureId.value++, ...lure }
}

// Loads a saved trip or blank defaults into the modal state; accepts the trip and updates draft fields.
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
  reelName.value = trip?.reel ?? ''
  reelId.value = props.tackleboxReels.find(reel =>
    reel.id === trip?.reelId || (!trip?.reelId && reel.name.trim().toLocaleLowerCase() === trip?.reel?.trim().toLocaleLowerCase())
  )?.id ?? ''
  selectedComboId.value = ''
  comboName.value = ''
  comboActionError.value = ''
}

// Appends a blank catch row; takes no input and updates the catch draft list.
function addCatch() {
  catches.value.push(newCatch())
}

// Toggles individual fish details for a catch; accepts the draft and resets quantity when enabling details.
function toggleCatchDetails(catchItem: CatchDraft) {
  catchItem.individualDetails = !catchItem.individualDetails
  if (catchItem.individualDetails) catchItem.quantity = 1
}

// Opens the device photo picker for a catch; accepts the draft and stores its selected image or error.
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

// Removes the selected or saved photo from a catch; accepts its draft and click event and clears photo state.
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

// Removes a catch draft by its local ID; accepts the ID and updates the catch list.
function removeCatch(id: number) {
  catches.value = catches.value.filter(item => item.id !== id)
}

// Appends a blank lure draft; takes no input and updates the lure draft list.
function addLure() {
  lures.value.push(newLure())
}

// Checks whether a lure is already in the trip draft; accepts its name/ID and returns a duplicate-match boolean.
function isTackleboxLureAdded(lure: { name: string; inventoryLureId?: string }) {
  return lures.value.some(item =>
    (lure.inventoryLureId && item.inventoryLureId === lure.inventoryLureId) ||
    item.name.trim().toLocaleLowerCase() === lure.name.trim().toLocaleLowerCase()
  )
}

// Adds a prior or saved lure only once; accepts its details and updates the lure drafts when not already present.
function addPreviousLure(lure: { name: string; notes: string; inventoryLureId?: string }) {
  if (!isTackleboxLureAdded(lure)) {
    lures.value.push(newLure({
      name: lure.name,
      notes: '',
      ...(lure.inventoryLureId ? { inventoryLureId: lure.inventoryLureId } : {})
    }))
  }
}

// Removes a lure draft and clears catch references to it; accepts the draft ID and updates both draft lists.
function removeLure(id: number) {
  lures.value = lures.value.filter(lure => lure.id !== id)
  catches.value = catches.value.map(catchItem =>
    catchItem.lureId === id ? { ...catchItem, lureId: '' } : catchItem
  )
}

// Applies a selected combo's lure and rig details; accepts its ID and updates the current trip draft.
function applySelectedCombo(id: string) {
  const combo = props.combos.find(item => item.id === id)
  if (!combo) return

  lures.value = combo.lures.map(name => newLure({ name, notes: '' }))
  hook.value = combo.hook
  line.value = combo.line
  weight.value = combo.weight
}

// Reset draft fields whenever the dialog opens so a new entry starts clean.
watch(() => [props.modelValue, props.trip] as const, ([isOpen, trip]) => {
  if (isOpen) {
    resetDraft(trip ?? null)
  }
})

// Converts draft values into a trip payload and emits it with catch photo files; takes no input and returns nothing.
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
    reel: reelName.value.trim(),
    ...(reelId.value ? { reelId: reelId.value } : {}),
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
          <TripSpotField v-model="location" :spots="spots" :loading="spotsLoading" />

          <TripCatchFields
            :catches="catches"
            :lures="lures"
            :is-native="isNative"
            :capture-photo="captureCatchPhoto"
            :remove-photo="removeCatchPhoto"
            @add="addCatch"
            @remove="removeCatch"
            @toggle-details="toggleCatchDetails"
          />

          <div class="form-field form-field-full">
            <label for="trip-conditions">Conditions</label>
            <input id="trip-conditions" v-model="conditions" placeholder="Weather, temperature, water conditions…" maxlength="100">
          </div>
          <TripComboPicker
            v-model="selectedComboId"
            :combos="combos"
            @apply="applySelectedCombo"
          />
          <TripLureFields
            :lures="lures"
            :previous-lures="previousLures"
            :tacklebox-lures="tackleboxLures"
            :loading="luresLoading"
            @add="addLure"
            @remove="removeLure"
            @add-saved="addPreviousLure"
          />
          <TripGearFields
            v-model:rod-name="rodName"
            v-model:rod-id="rodId"
            v-model:reel-name="reelName"
            v-model:reel-id="reelId"
            v-model:hook="hook"
            v-model:line="line"
            v-model:weight="weight"
            v-model:water-depth="waterDepth"
            :rods="tackleboxRods"
            :reels="tackleboxReels"
          />
          <div class="form-field form-field-full">
            <label for="trip-notes">Trip notes</label>
            <textarea id="trip-notes" v-model="notes" placeholder="The good bits, what worked, what you might try next time…" maxlength="1000" />
          </div>

          <div class="form-field form-field-full">
            <label for="trip-photos">Trip photos</label>
            <input id="trip-photos" type="file" accept="image/*" disabled aria-describedby="trip-photos-status">
            <p id="trip-photos-status" class="photo-status">Photo uploads are temporarily unavailable.</p>
          </div>
          <TripComboSave
            v-model:combo-name="comboName"
            v-model:action-error="comboActionError"
            :lures="lures"
            :hook="hook"
            :line="line"
            :weight="weight"
            :saving="savingCombo"
            :save-error="comboSaveError"
            :save-success="comboSaveSuccess"
            @save="emit('saveCombo', $event)"
          />
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
.form-field > label span { color: #98a39c; font-size: 12px; font-weight: 400; }
.photo-status { color: #89958e; font-size: 12px; margin: 7px 0 0; }
.offline-save-note { background: #edf5ed; border-radius: 7px; color: #46694c; font-size: 12px; line-height: 1.5; margin: 0 0 14px; padding: 9px 11px; }
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 12px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
@media (max-width: 500px) {
  .modal-backdrop { align-items: flex-start; overflow-y: auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
  .modal { border-radius: 12px; max-height: calc(100dvh - 24px); padding: 18px; }
  .modal-close { flex: 0 0 40px; height: 40px; width: 40px; }
  .form-actions > button { flex: 1; min-height: 44px; }
}
</style>
