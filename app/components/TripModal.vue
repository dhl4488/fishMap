<script setup lang="ts">
import type { FishingCombo, FishingLure, FishingSpot, FishingTrip, TackleboxLure, TackleboxReel, TackleboxRod } from '../composables/useFishingData'
import type { CatchDraft } from '../types/tripCatchDraft'
import type { TripLureDraft } from '../types/tripLureDraft'
import { fetchTripWeather } from '../utils/openMeteo'
import { isCurrentOrPastDate, isWithinMeasurementRange, isWithinNumericRange } from '../utils/tripInputValidation'
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
const {
  addTackleboxLure,
  addTackleboxRod,
  addTackleboxReel
} = useFishingData()
const { isNative } = useNativeFeatures()
const emit = defineEmits<{
  close: []
  save: [trip: Omit<FishingTrip, 'id'>, photos: File[], catchPhotos: Array<File | null>, favoriteSpot?: Omit<FishingSpot, 'id'>]
  saveCombo: [combo: Omit<FishingCombo, 'id'>]
}>()

// Converts a date to a local YYYY-MM-DD value for the date input; returns a calendar-date string.
function localDateString(date: Date) {
  // Offset before ISO formatting to preserve the calendar date in the user's timezone.
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

const today = ref(localDateString(new Date()))
const date = ref(today.value)
const step = ref<'spot' | 'details'>('spot')
const location = ref('')
const coordinates = ref<{ latitude: number; longitude: number } | null>(null)
const spotWater = ref('')
const spotKind = ref('Freshwater · Lake')
const spotNotes = ref('')
const saveAsFavorite = ref(false)
const catches = ref<CatchDraft[]>([])
const nextCatchId = ref(0)
const lures = ref<TripLureDraft[]>([])
const nextLureId = ref(0)
const conditions = ref('')
const hoursFished = ref<string | number>('')
const airTemperature = ref<string | number>('')
const waterTemperature = ref<string | number>('')
const windSpeed = ref<string | number>('')
const windDirection = ref('')
const cloudCover = ref('')
const precipitation = ref('')
const weatherLoading = ref(false)
const weatherError = ref('')
const weatherStatus = ref('')
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
const gearModalKind = ref<'lure' | 'rod' | 'reel' | null>(null)
const gearModalSaving = ref(false)
const gearModalError = ref('')
const submissionError = ref('')
const isAlreadyFavorite = computed(() => Boolean(coordinates.value && props.spots.some(spot =>
  spot.latitude === coordinates.value?.latitude && spot.longitude === coordinates.value?.longitude
)))

// Creates a blank catch draft; takes no input and returns a draft with a unique local ID.
function newCatch(): CatchDraft {
  return {
    id: nextCatchId.value++,
    species: '',
    quantity: 1,
    time: '',
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
  today.value = localDateString(new Date())
  step.value = trip ? 'details' : 'spot'
  submissionError.value = ''
  location.value = trip?.location ?? ''
  coordinates.value = trip?.latitude !== undefined && trip.longitude !== undefined
    ? { latitude: trip.latitude, longitude: trip.longitude }
    : null
  const savedSpot = props.spots.find(spot =>
    (spot.latitude === trip?.latitude && spot.longitude === trip?.longitude) ||
    (spot.name === trip?.location && trip?.latitude === undefined)
  )
  spotWater.value = trip?.spotWater ?? savedSpot?.water ?? ''
  spotKind.value = trip?.spotKind ?? savedSpot?.kind ?? 'Freshwater · Lake'
  spotNotes.value = trip?.spotNotes ?? savedSpot?.notes ?? ''
  saveAsFavorite.value = false
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
          time: item.time ?? '',
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
  date.value = trip?.date ?? today.value
  conditions.value = trip?.conditions ?? ''
  hoursFished.value = trip?.hoursFished ?? ''
  airTemperature.value = trip?.airTemperature ?? ''
  waterTemperature.value = trip?.waterTemperature ?? ''
  windSpeed.value = trip?.windSpeed ?? ''
  windDirection.value = trip?.windDirection ?? ''
  cloudCover.value = trip?.cloudCover ?? ''
  precipitation.value = trip?.precipitation ?? ''
  weatherError.value = ''
  weatherStatus.value = ''
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

// Advances from the location step after confirming the new trip has a named, pinned spot.
function continueToTripDetails() {
  submissionError.value = ''
  if (!location.value.trim()) {
    submissionError.value = 'Add a name for this fishing spot.'
    return
  }
  if (!spotWater.value.trim()) {
    submissionError.value = 'Add the water or place name for this spot.'
    return
  }
  if (!props.trip && !coordinates.value) {
    submissionError.value = 'Pick a spot on the map before continuing.'
    return
  }
  step.value = 'details'
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

async function fillWeatherFromLocation() {
  const requestedDate = date.value
  const requestedLocation = location.value.trim()
  weatherError.value = ''
  weatherStatus.value = ''
  if (!requestedLocation) {
    weatherError.value = 'Enter a trip location before looking up weather.'
    return
  }

  weatherLoading.value = true
  try {
    const weather = await fetchTripWeather(requestedDate, requestedLocation, props.spots, coordinates.value ?? undefined)
    if (date.value !== requestedDate || location.value.trim() !== requestedLocation) {
      throw new Error('Trip date or location changed during the lookup. Try again to get matching weather.')
    }

    if (weather.airTemperature !== undefined) airTemperature.value = weather.airTemperature
    if (weather.windSpeed !== undefined) windSpeed.value = weather.windSpeed
    if (weather.windDirection !== undefined) windDirection.value = weather.windDirection
    if (weather.cloudCover !== undefined) cloudCover.value = weather.cloudCover
    if (weather.precipitation !== undefined) precipitation.value = weather.precipitation
    weatherStatus.value = `Daily estimate for ${weather.resolvedLocation} applied. Review the values before saving. Water temperature is unchanged.`
  } catch (error) {
    weatherError.value = error instanceof Error ? error.message : 'Could not retrieve weather for this trip.'
  } finally {
    weatherLoading.value = false
  }
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

// Opens the shared tacklebox form for a new lure.
function addLure() {
  openGearModal('lure')
}

// Opens the shared tacklebox form for the selected type of gear.
function openGearModal(kind: 'lure' | 'rod' | 'reel') {
  gearModalKind.value = kind
  gearModalError.value = ''
}

function closeGearModal() {
  if (gearModalSaving.value) return
  gearModalKind.value = null
  gearModalError.value = ''
}

async function saveTripLure(lure: Omit<TackleboxLure, 'id'>) {
  gearModalSaving.value = true
  gearModalError.value = ''
  try {
    const savedLure = await addTackleboxLure(lure)
    addPreviousLure({ name: savedLure.name, notes: '', inventoryLureId: savedLure.id })
    gearModalKind.value = null
  } catch (error) {
    gearModalError.value = error instanceof Error ? error.message : 'Could not save this lure.'
  } finally {
    gearModalSaving.value = false
  }
}

async function saveTripRod(rod: Omit<TackleboxRod, 'id'>) {
  gearModalSaving.value = true
  gearModalError.value = ''
  try {
    const savedRod = await addTackleboxRod(rod)
    rodName.value = savedRod.name
    rodId.value = savedRod.id
    gearModalKind.value = null
  } catch (error) {
    gearModalError.value = error instanceof Error ? error.message : 'Could not save this rod.'
  } finally {
    gearModalSaving.value = false
  }
}

async function saveTripReel(reel: Omit<TackleboxReel, 'id'>) {
  gearModalSaving.value = true
  gearModalError.value = ''
  try {
    const savedReel = await addTackleboxReel(reel)
    reelName.value = savedReel.name
    reelId.value = savedReel.id
    gearModalKind.value = null
  } catch (error) {
    gearModalError.value = error instanceof Error ? error.message : 'Could not save this reel.'
  } finally {
    gearModalSaving.value = false
  }
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
    gearModalKind.value = null
  }
})

watch(() => props.modelValue, isOpen => {
  if (!isOpen && !gearModalSaving.value) closeGearModal()
})

// Converts draft values into a trip payload and emits it with catch photo files; takes no input and returns nothing.
function submitTrip() {
  submissionError.value = ''
  const currentDate = localDateString(new Date())
  if (!isCurrentOrPastDate(date.value, currentDate)) {
    submissionError.value = 'Choose a valid trip date that is today or earlier.'
    return
  }
  if (!props.trip && !coordinates.value) {
    submissionError.value = 'Pick a spot on the map before saving your trip.'
    return
  }
  if (!isWithinNumericRange(airTemperature.value, -90, 60)) {
    submissionError.value = 'Air temperature must be between -90°C and 60°C.'
    return
  }
  if (!isWithinNumericRange(waterTemperature.value, -2, 45)) {
    submissionError.value = 'Water temperature must be between -2°C and 45°C.'
    return
  }
  if (!isWithinNumericRange(windSpeed.value, 0, 500)) {
    submissionError.value = 'Wind speed must be between 0 and 500 km/h.'
    return
  }
  if (!isWithinNumericRange(hoursFished.value, 0.25, 24)) {
    submissionError.value = 'Time fished must be between 0.25 and 24 hours.'
    return
  }
  if (!isWithinMeasurementRange(weight.value, 'tackleWeight')) {
    submissionError.value = 'Tackle weight must be a positive measurement no greater than 45 kg.'
    return
  }
  if (!isWithinMeasurementRange(waterDepth.value, 'depth')) {
    submissionError.value = 'Water depth must be a positive measurement no greater than 6,100 m.'
    return
  }
  const invalidCatch = catches.value.find(item =>
    item.species.trim() &&
    item.individualDetails &&
    (!isWithinMeasurementRange(item.length, 'length') || !isWithinMeasurementRange(item.weight, 'weight'))
  )
  if (invalidCatch) {
    submissionError.value = 'Fish length must be a positive measurement up to 305 cm, and weight up to 227 kg.'
    return
  }

  const validCatchDrafts = catches.value.filter(item => item.species.trim().length > 0)
  if (validCatchDrafts.some(item => !item.individualDetails && (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999))) {
    submissionError.value = 'Catch quantity must be between 1 and 999.'
    return
  }
  const tripCatches = validCatchDrafts
    .map((catchItem) => {
      const { species, quantity, lureId } = catchItem
      const lure = lures.value.find(item => item.id === lureId)?.name.trim()
      return {
        species: species.trim(),
        quantity: catchItem.individualDetails ? 1 : quantity,
        ...(catchItem.time ? { time: catchItem.time } : {}),
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
  const favoriteCoordinates = coordinates.value
  const favoriteSpot = saveAsFavorite.value && !isAlreadyFavorite.value && favoriteCoordinates
    ? {
        name: location.value.trim(),
        water: spotWater.value.trim(),
        kind: spotKind.value,
        latitude: favoriteCoordinates.latitude,
        longitude: favoriteCoordinates.longitude,
        notes: spotNotes.value.trim()
      }
    : undefined

  emit('save', {
    date: date.value,
    location: location.value.trim(),
    ...(coordinates.value ? { latitude: coordinates.value.latitude, longitude: coordinates.value.longitude } : {}),
    spotWater: spotWater.value.trim(),
    spotKind: spotKind.value,
    spotNotes: spotNotes.value.trim(),
    catches: tripCatches,
    conditions: conditions.value.trim(),
    ...(String(hoursFished.value).trim() ? { hoursFished: Number(hoursFished.value) } : {}),
    ...(String(airTemperature.value).trim() ? { airTemperature: String(airTemperature.value).trim() } : {}),
    ...(String(waterTemperature.value).trim() ? { waterTemperature: String(waterTemperature.value).trim() } : {}),
    ...(String(windSpeed.value).trim() ? { windSpeed: String(windSpeed.value).trim() } : {}),
    ...(windDirection.value ? { windDirection: windDirection.value } : {}),
    ...(cloudCover.value ? { cloudCover: cloudCover.value } : {}),
    ...(precipitation.value ? { precipitation: precipitation.value } : {}),
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
  }, [], catchPhotoFiles, favoriteSpot)
}

</script>

<template>
  <!-- Teleport keeps the modal above app layout stacking contexts. -->
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" @click.self="!saving && emit('close')" @keydown.esc="!saving && emit('close')">
      <form class="modal trip-modal" @submit.prevent="submitTrip">
        <div class="modal-header">
          <div>
            <p class="eyebrow">{{ trip ? 'EDIT YOUR ENTRY' : 'A NEW ENTRY' }}</p>
            <h2>{{ step === 'spot' ? 'Pick your fishing spot' : trip ? 'Edit fishing trip' : 'Log a fishing trip' }}</h2>
            <p>{{ step === 'spot' ? 'Pin the place where you fished, then add the rest of your trip details.' : trip ? 'Update the details from your day on the water.' : 'Hold on to the little details that make a day.' }}</p>
          </div>
          <button class="modal-close" type="button" aria-label="Close dialog" :disabled="saving" @click="emit('close')">×</button>
        </div>
        <p v-if="saveError" class="trip-save-error" role="alert">{{ saveError }}</p>
        <p v-if="submissionError" class="trip-save-error" role="alert">{{ submissionError }}</p>
        <p v-if="offlineMode && step === 'details'" class="offline-save-note" role="status">
          <template v-if="trip">Existing trips can't be edited offline. Cancel and log a new trip to save it on this device for syncing later.</template>
          <template v-else>You're offline. This trip and its catch photos will be saved on this device and uploaded when you're connected again.</template>
        </p>
        <section v-if="step === 'spot'" class="trip-location-step">
          <div class="trip-step-indicator"><span class="trip-step-active">1</span><span class="trip-step-line" /><span>2</span><span>Choose a spot <span aria-hidden="true">→</span> Trip details</span></div>
          <TripSpotField
            v-model="location"
            v-model:coordinates="coordinates"
            v-model:water="spotWater"
            v-model:kind="spotKind"
            v-model:notes="spotNotes"
            :spots="spots"
            :loading="spotsLoading"
          />
          <label v-if="!isAlreadyFavorite" class="favorite-spot-option">
            <input v-model="saveAsFavorite" type="checkbox">
            <span>
              <strong>Save as a favorite spot</strong>
              <span>Keep this location on your Fishing Spots map for next time.</span>
            </span>
          </label>
          <div class="form-actions">
            <button class="cancel-button" type="button" :disabled="saving" @click="emit('close')">Cancel</button>
            <button class="primary-button" type="button" @click="continueToTripDetails">Continue to trip details</button>
          </div>
        </section>
        <div v-else class="trip-details-step">
          <div class="trip-step-indicator"><span>1</span><span class="trip-step-line" /><span class="trip-step-active">2</span><span>Choose a spot <span aria-hidden="true">→</span> Trip details</span></div>
          <div class="trip-location-summary">
            <span class="saved-spot-pin" aria-hidden="true">⌖</span>
            <div>
              <strong>{{ location || 'Fishing spot not named' }}</strong>
              <span v-if="coordinates">{{ coordinates.latitude.toFixed(5) }}, {{ coordinates.longitude.toFixed(5) }}</span>
              <span v-else>Location for this older trip</span>
            </div>
            <button class="text-button" type="button" @click="step = 'spot'">Change spot</button>
          </div>
          <div class="form-grid trip-sections">
            <section class="trip-section">
            <h3>Trip details</h3>
            <div class="trip-section-grid">
              <div class="form-field">
                <label for="trip-date">Date</label>
                <input id="trip-date" v-model="date" type="date" :max="today" required>
              </div>
              <div class="form-field">
                <label for="trip-hours-fished">Time fished (hours) <span>(optional)</span></label>
                <input id="trip-hours-fished" v-model="hoursFished" type="number" min="0.25" max="24" step="0.25" placeholder="e.g. 4">
                <small class="trip-duration-help">Used to compare catch rates. Leave blank if you’re unsure.</small>
              </div>
              <div class="trip-environmental-fields form-field-full">
                <div class="trip-environmental-heading">
                  <h4>Environmental conditions</h4>
                  <button class="secondary-button" type="button" :disabled="weatherLoading || !location.trim()" @click="fillWeatherFromLocation">
                    {{ weatherLoading ? 'Looking up weather…' : 'Fill from weather' }}
                  </button>
                </div>
                <p class="trip-weather-attribution">
                  Daily estimates from <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> use the trip date and location. Review before saving.
                </p>
                <p v-if="weatherError" class="trip-weather-error" role="alert">{{ weatherError }}</p>
                <p v-if="weatherStatus" class="trip-weather-status" role="status">{{ weatherStatus }}</p>
                <div class="trip-environmental-grid">
                  <div class="form-field">
                    <label for="trip-air-temperature">Air temperature (°C)</label>
                    <input id="trip-air-temperature" v-model="airTemperature" type="number" min="-90" max="60" step="any" placeholder="e.g. 18">
                  </div>
                  <div class="form-field">
                    <label for="trip-water-temperature">Water temperature (°C)</label>
                    <input id="trip-water-temperature" v-model="waterTemperature" type="number" min="-2" max="45" step="any" placeholder="e.g. 14">
                  </div>
                  <div class="form-field">
                    <label for="trip-wind-speed">Wind speed (km/h)</label>
                    <input id="trip-wind-speed" v-model="windSpeed" type="number" min="0" max="500" step="any" placeholder="e.g. 12">
                  </div>
                  <div class="form-field">
                    <label for="trip-wind-direction">Wind direction</label>
                    <select id="trip-wind-direction" v-model="windDirection">
                      <option value="">Not recorded</option>
                      <option v-for="direction in ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']" :key="direction" :value="direction">{{ direction }}</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="trip-cloud-cover">Cloud cover</label>
                    <select id="trip-cloud-cover" v-model="cloudCover">
                      <option value="">Not recorded</option>
                      <option>Clear</option>
                      <option>Partly cloudy</option>
                      <option>Mostly cloudy</option>
                      <option>Overcast</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="trip-precipitation">Precipitation</label>
                    <select id="trip-precipitation" v-model="precipitation">
                      <option value="">Not recorded</option>
                      <option>None</option>
                      <option>Rain</option>
                      <option>Snow</option>
                      <option>Drizzle</option>
                      <option>Mixed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="form-field form-field-full">
                <label for="trip-conditions">Other conditions <span>(optional)</span></label>
                <input id="trip-conditions" v-model="conditions" placeholder="e.g. water clarity, tide, current" maxlength="100">
              </div>
            </div>
            </section>

            <section class="trip-section">
            <h3>Catch Log</h3>
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
            </section>

            <section class="trip-section">
            <h3>Lures and gear</h3>
            <div class="trip-section-grid">
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
                @add-rod="openGearModal('rod')"
                @add-reel="openGearModal('reel')"
              />
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
            </section>

            <section class="trip-section">
            <h3>Trip notes and photos</h3>
            <div class="trip-section-grid">
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
            </section>
          </div>
          <div class="form-actions">
            <button class="cancel-button" type="button" :disabled="saving" @click="emit('close')">Cancel</button>
            <button class="cancel-button" type="button" :disabled="saving" @click="step = 'spot'">Back to spot</button>
            <button class="primary-button" type="submit" :disabled="saving || (offlineMode && !!trip)">{{ saving ? 'Saving trip…' : offlineMode && trip ? 'Reconnect to save' : trip ? 'Save changes' : 'Save to diary' }}</button>
          </div>
        </div>
      </form>
    </div>
  </Teleport>
  <TackleboxGearModal
    v-if="gearModalKind === 'lure'"
    kind="lure"
    :saving="gearModalSaving"
    :error="gearModalError"
    @close="closeGearModal"
    @save-lure="saveTripLure"
  />
  <TackleboxGearModal
    v-if="gearModalKind === 'rod'"
    kind="rod"
    :saving="gearModalSaving"
    :error="gearModalError"
    @close="closeGearModal"
    @save-rod="saveTripRod"
  />
  <TackleboxGearModal
    v-if="gearModalKind === 'reel'"
    kind="reel"
    :saving="gearModalSaving"
    :error="gearModalError"
    @close="closeGearModal"
    @save-reel="saveTripReel"
  />
</template>

<style scoped>
.form-field > label span { color: #98a39c; font-size: 12px; font-weight: 400; }
.photo-status { color: #89958e; font-size: 12px; margin: 7px 0 0; }
.offline-save-note { background: #edf5ed; border-radius: 7px; color: #46694c; font-size: 12px; line-height: 1.5; margin: 0 0 14px; padding: 9px 11px; }
.trip-save-error { background: #fbf0ec; border-radius: 7px; color: #985b45; font-size: 12px; line-height: 1.5; margin: 0 0 14px; padding: 10px 12px; }
.modal-backdrop { align-items: flex-start; overflow-y: auto; }
.trip-modal { box-sizing: border-box; margin-block: auto; max-height: calc(100vh - 36px); max-height: calc(100dvh - 36px); max-width: 900px; overflow-y: auto; padding: 30px; }
.trip-location-step,.trip-details-step { display: grid; gap: 16px; min-width: 0; }
.trip-location-step :deep(.pick-spot-card) { gap: 14px; padding: 16px; }
.trip-step-indicator { align-items: center; color: #89958e; display: flex; font-size: 12px; gap: 9px; }
.trip-step-indicator > span:first-child,.trip-step-indicator > span:nth-child(3) { align-items: center; background: #edf1ec; border-radius: 50%; display: flex; flex: 0 0 28px; height: 28px; justify-content: center; }
.trip-step-indicator > .trip-step-active { background: #316b53; color: white; }
.trip-step-line { background: #dfe6de; flex: 0 0 24px; height: 1px; }
.trip-step-indicator > span:last-child { color: #76857b; }
.trip-location-step .form-actions { margin-top: 0; }
.trip-location-step .form-actions .primary-button { margin-left: auto; }
.trip-location-summary { align-items: center; background: #f3f7f2; border: 1px solid #e4eae3; border-radius: 9px; display: flex; gap: 10px; min-width: 0; padding: 10px 12px; }
.trip-location-summary > div { display: grid; flex: 1; gap: 3px; min-width: 0; }
.trip-location-summary strong { color: #425148; font-size: 13px; overflow-wrap: anywhere; }
.trip-location-summary > div > span { color: #89958e; font-size: 12px; }
.favorite-spot-option { align-items: flex-start; background: #f8faf7; border: 1px solid #e4eae3; border-radius: 9px; color: #536158; cursor: pointer; display: flex; gap: 10px; padding: 12px 14px; }
.favorite-spot-option input { accent-color: #316b53; flex: 0 0 auto; height: 18px; margin: 1px 0 0; width: 18px; }
.favorite-spot-option > span { display: grid; gap: 4px; }
.favorite-spot-option strong { color: #425148; font-size: 13px; }
.favorite-spot-option > span > span { color: #89958e; font-size: 12px; line-height: 1.4; }
.trip-modal .modal-header { margin-bottom: 26px; }
.trip-modal .modal-header h2 { font-size: 23px; }
.trip-modal .modal-header p { font-size: 14px; line-height: 1.5; }
.trip-modal .trip-sections { gap: 16px; }
.trip-modal .trip-section { background: #f8faf7; border: 1px solid #e4eae3; border-radius: 11px; display: grid; gap: 14px; grid-column: 1 / -1; padding: 17px; }
.trip-modal .trip-section h3 { color: #34483c; font: 700 16px/1.3 Manrope, sans-serif; margin: 0; }
.trip-modal .trip-section-grid { display: grid; gap: 16px 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.trip-modal .trip-environmental-fields { border-top: 1px solid #e4eae3; display: grid; gap: 12px; padding-top: 14px; }
.trip-modal .trip-environmental-heading { align-items: center; display: flex; flex-wrap: wrap; gap: 8px 14px; justify-content: space-between; }
.trip-modal .trip-environmental-fields h4 { color: #536158; font-size: 14px; margin: 0; }
.trip-modal .trip-weather-attribution,
.trip-modal .trip-weather-status,
.trip-modal .trip-weather-error { font-size: 13px; line-height: 1.5; margin: 0; }
.trip-modal .trip-weather-attribution,
.trip-modal .trip-weather-status { color: #718078; }
.trip-modal .trip-weather-attribution a { color: #477353; text-decoration: underline; text-underline-offset: 2px; }
.trip-modal .trip-weather-error { color: #985b45; }
.trip-modal .trip-duration-help { color: #89958e; font-size: 12px; font-weight: 400; line-height: 1.4; }
.trip-modal .trip-environmental-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.trip-modal :deep(.trip-section-grid > .form-field-full) { grid-column: 1 / -1; }
.trip-modal :deep(.form-field) { gap: 8px; }
.trip-modal :deep(.form-field label) { font-size: 14px; }
.trip-modal :deep(.form-field input),
.trip-modal :deep(.form-field select),
.trip-modal :deep(.form-field textarea) { font-size: 15px; min-height: 46px; padding: 11px 12px; }
.trip-modal :deep(.form-field textarea) { min-height: 96px; }
.trip-modal :deep(.text-button),
.trip-modal :deep(.primary-button),
.trip-modal :deep(.secondary-button) { font-size: 14px; }
.trip-modal :deep(.photo-status),
.trip-modal :deep(.offline-save-note),
.trip-modal :deep(.trip-save-error),
.trip-modal :deep(.saved-lure-label),
.trip-modal :deep(.saved-lure-option-copy strong),
.trip-modal :deep(.saved-lure-option-copy span),
.trip-modal :deep(.saved-lure-empty),
.trip-modal :deep(.trip-lure-name),
.trip-modal :deep(.catch-photo-status-text),
.trip-modal :deep(.catch-photo-error),
.trip-modal :deep(.catch-photo-status),
.trip-modal :deep(.combo-picker label),
.trip-modal :deep(.combo-save > label) { font-size: 14px; }
.trip-modal :deep(.catch-form-heading) { margin-bottom: 4px; }
.trip-modal :deep(.saved-lure-picker) { gap: 9px; margin-top: 14px; }
.trip-modal :deep(.lure-form-row) { gap: 12px; margin-top: 12px; }
.trip-modal :deep(.rod-field) { margin-top: 4px; }
.trip-modal .form-actions { margin-top: 26px; }
.trip-modal .form-actions button { font-size: 14px; min-height: 46px; padding: 11px 16px; }
@media (max-width: 500px) {
  .modal-backdrop { align-items: flex-start; overflow-y: auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); }
  .modal { border-radius: 12px; max-height: calc(100dvh - 24px); padding: 18px; }
  .trip-modal { max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px); }
  .trip-modal .modal-header { margin-bottom: 18px; }
  .trip-location-step :deep(.pick-spot-card) { padding: 10px; }
  .trip-location-summary { align-items: flex-start; flex-wrap: wrap; }
  .trip-location-summary .text-button { margin-left: 37px; }
  .trip-step-indicator { flex-wrap: wrap; }
  .trip-modal .trip-section { gap: 12px; padding: 14px; }
  .trip-modal .trip-section-grid { gap: 14px 10px; grid-template-columns: minmax(0, 1fr); }
  .trip-modal .trip-environmental-grid { grid-template-columns: minmax(0, 1fr); }
  .trip-modal :deep(.trip-section-grid > .form-field) { grid-column: 1 / -1; }
  .modal-close { flex: 0 0 40px; height: 40px; width: 40px; }
  .form-actions > button { flex: 1; min-height: 44px; }
}
</style>
