<script setup lang="ts">
import type { FishingCombo, FishingTrip } from '../composables/useFishingData'

useHead({ title: 'My diary · Tidelog', meta: [{ name: 'description', content: 'Browse and search your fishing trip diary.' }] })

const { data, addTrip, updateTrip, deleteTrip, addCombo, loading: dataLoading, error: dataError } = useFishingData()
const tripModalOpen = ref(false)
const editingTrip = ref<FishingTrip | null>(null)
const query = ref('')
const yearFilter = ref('all')
const toastMessage = ref('')
const tripSaving = ref(false)
const tripSaveError = ref<string | null>(null)
const comboSaving = ref(false)
const comboSaveError = ref<string | null>(null)
const comboSaveSuccess = ref<string | null>(null)
const tripActionError = ref('')
const deletingTripId = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const years = computed(() => [...new Set(data.value.trips.map(trip => trip.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)))
const filteredTrips = computed(() => [...data.value.trips]
  .filter((trip) => {
    const lureSearchText = trip.lures?.map(lure => `${lure.name} ${lure.notes}`).join(' ') ?? ''
    const gearSearchText = `${trip.hook ?? ''} ${trip.line ?? ''} ${trip.weight ?? ''}`
    const searchText = `${trip.location} ${trip.conditions} ${lureSearchText} ${gearSearchText} ${trip.waterDepth ?? ''} ${trip.notes} ${trip.catches.map(item => item.species).join(' ')}`.toLowerCase()
    return searchText.includes(query.value.toLowerCase()) && (yearFilter.value === 'all' || trip.date.startsWith(yearFilter.value))
  })
  .sort((a, b) => b.date.localeCompare(a.date)))

function catchSummary(trip: FishingTrip) {
  const count = trip.catches.reduce((sum, item) => sum + item.quantity, 0)
  if (count === 0) return 'Skunked'
  return `${count} ${count === 1 ? 'catch' : 'catches'}`
}

function openNewTrip() {
  editingTrip.value = null
  tripSaveError.value = null
  comboSaveError.value = null
  comboSaveSuccess.value = null
  tripModalOpen.value = true
}

function closeTripModal() {
  tripModalOpen.value = false
  editingTrip.value = null
}

// Format diary dates without allowing timezone conversion to change the calendar day.
function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
    full: new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
  }
}

async function saveTrip(trip: Omit<FishingTrip, 'id'>, photos: File[]) {
  tripSaving.value = true
  tripSaveError.value = null
  try {
    if (editingTrip.value) {
      await updateTrip(editingTrip.value.id, trip)
      toastMessage.value = 'Trip updated.'
    } else {
      await addTrip(trip, photos)
      toastMessage.value = 'Trip added to your diary.'
    }
    tripModalOpen.value = false
    editingTrip.value = null
  } catch (error) {
    tripSaveError.value = error instanceof Error ? error.message : 'Could not save this trip.'
  } finally {
    tripSaving.value = false
  }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2800)
}

async function saveCombo(combo: Omit<FishingCombo, 'id'>) {
  comboSaving.value = true
  comboSaveError.value = null
  comboSaveSuccess.value = null
  try {
    await addCombo(combo)
    comboSaveSuccess.value = 'Combo preset saved and ready to use.'
  } catch (error) {
    comboSaveError.value = error instanceof Error ? error.message : 'Could not save this combo preset.'
  } finally {
    comboSaving.value = false
  }
}

function editTrip(trip: FishingTrip) {
  tripActionError.value = ''
  editingTrip.value = trip
  tripSaveError.value = null
  comboSaveError.value = null
  comboSaveSuccess.value = null
  tripModalOpen.value = true
}

async function removeTrip(trip: FishingTrip) {
  if (!window.confirm(`Delete the fishing trip at ${trip.location}? This cannot be undone.`)) return

  deletingTripId.value = trip.id
  tripActionError.value = ''
  try {
    await deleteTrip(trip.id)
    toastMessage.value = 'Trip deleted.'
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastMessage.value = '' }, 2800)
  } catch (error) {
    tripActionError.value = error instanceof Error ? error.message : 'Could not delete this trip.'
  } finally {
    deletingTripId.value = null
  }
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <!-- Searchable, year-filtered timeline for the signed-in user's fishing trips. -->
  <div class="page-wrap">
    <header class="topbar">
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>My diary</strong></div>
      <div class="topbar-right"><NuxtLink class="secondary-button" to="/maps">⌖ &nbsp; Find a spot</NuxtLink></div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">THE DAYS YOU'LL REMEMBER</p>
        <h1>My fishing diary</h1>
        <p class="subtitle">Little notes, big catches, and everything in between.</p>
      </div>
      <button class="primary-button" @click="openNewTrip"><span class="plus">＋</span> Log a trip</button>
    </section>

    <div v-if="dataError" class="auth-message auth-error" role="alert">{{ dataError }}</div>
    <div v-if="tripActionError" class="auth-message auth-error" role="alert">{{ tripActionError }}</div>

    <div class="toolbar-row">
      <label class="search-box">
        <span aria-hidden="true">⌕</span>
        <input v-model="query" aria-label="Search trips" placeholder="Search trips, places, or catches">
      </label>
      <select v-model="yearFilter" class="filter-select" aria-label="Filter trips by year">
        <option value="all">All years</option>
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      <span class="diary-count">{{ filteredTrips.length }} {{ filteredTrips.length === 1 ? 'entry' : 'entries' }}</span>
    </div>

    <div v-if="dataLoading" class="panel empty-state empty-panel">Loading your diary…</div>
    <div v-else-if="filteredTrips.length" class="diary-list">
      <article v-for="trip in filteredTrips" :key="trip.id" class="panel diary-entry">
        <div class="entry-header">
          <div class="entry-heading">
            <div class="trip-date-box"><strong>{{ dateParts(trip.date).day }}</strong><span>{{ dateParts(trip.date).month }}</span></div>
            <div><h2>{{ trip.location }}</h2><p>{{ dateParts(trip.date).full }} <span v-if="trip.conditions"> · {{ trip.conditions }}</span></p></div>
          </div>
          <div class="entry-actions">
            <span class="entry-weather">{{ catchSummary(trip) }}</span>
            <button class="entry-action-button" type="button" :disabled="deletingTripId !== null || tripSaving" @click="editTrip(trip)">Edit</button>
            <button
              class="entry-action-button entry-delete-button"
              type="button"
              :disabled="deletingTripId !== null || tripSaving"
              :aria-label="`Delete trip at ${trip.location}`"
              @click="removeTrip(trip)"
            >{{ deletingTripId === trip.id ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
        <div v-if="trip.lures?.length || trip.hook || trip.line || trip.weight || trip.waterDepth" class="entry-trip-details">
          <div v-if="trip.lures?.length" class="entry-lures">
            <strong>Lures:</strong>
            <ul>
              <li v-for="(lure, index) in trip.lures" :key="`${lure.name}-${index}`">
                <span>{{ lure.name }}</span><span v-if="lure.notes"> — {{ lure.notes }}</span>
              </li>
            </ul>
          </div>
          <span v-if="trip.hook"><strong>Hook:</strong> {{ trip.hook }}</span>
          <span v-if="trip.line"><strong>Line:</strong> {{ trip.line }}</span>
          <span v-if="trip.weight"><strong>Weight:</strong> {{ trip.weight }}</span>
          <span v-if="trip.waterDepth"><strong>Water depth:</strong> {{ trip.waterDepth }}</span>
        </div>
        <div v-if="trip.catches.length" class="entry-catches">
          <div v-for="(item, index) in trip.catches" :key="`${item.species}-${index}`" class="catch-model-row">
            <FishModel :species="item.species" />
            <div class="catch-model-details">
              <span class="catch-chip">{{ item.species }}</span>
              <span class="catch-quantity">{{ item.quantity }} caught</span>
            </div>
          </div>
        </div>
        <div v-if="trip.photos?.length" class="entry-photo-gallery" aria-label="Trip photos">
          <a
            v-for="(photo, index) in trip.photos"
            :key="photo"
            :href="photo"
            target="_blank"
            rel="noreferrer"
            class="entry-photo"
            :aria-label="`Open trip photo ${index + 1} in a new tab`"
          >
            <img :src="photo" :alt="`Photo ${index + 1} from ${trip.location}`" loading="lazy">
          </a>
        </div>
        <p v-if="trip.notes" class="entry-notes">{{ trip.notes }}</p>
      </article>
    </div>
    <div v-else class="panel empty-state empty-panel">
      <span>{{ query ? '⌕' : '⌁' }}</span>
      <strong>{{ query ? 'No trips match that search.' : 'No trips in your diary yet.' }}</strong>
      <span>{{ query ? 'Try another place, catch, or keyword.' : 'Log your first day on the water to get started.' }}</span>
      <button v-if="!query" class="primary-button" style="margin-top:6px" @click="openNewTrip">Log a trip</button>
    </div>
  </div>

  <TripModal
    :model-value="tripModalOpen"
    :trip="editingTrip"
    :combos="data.combos"
    :saving="tripSaving"
    :save-error="tripSaveError"
    :saving-combo="comboSaving"
    :combo-save-error="comboSaveError"
    :combo-save-success="comboSaveSuccess"
    @close="closeTripModal"
    @save="saveTrip"
    @save-combo="saveCombo"
  />
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>

<style scoped>
.diary-count { color: #929d96; font-size: 10px; margin-left: auto; }
.entry-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.entry-action-button { background: #f7f8f5; border: 1px solid #e4e9e3; border-radius: 6px; color: #536158; cursor: pointer; font-size: 10px; min-height: 36px; padding: 5px 10px; }
.entry-action-button:hover:not(:disabled) { border-color: #a6b9a8; }
.entry-action-button:disabled { cursor: wait; opacity: .6; }
.entry-delete-button { color: #985b45; }
.entry-trip-details { align-items: flex-start; color: #718078; display: flex; flex-wrap: wrap; font-size: 11px; gap: 5px 18px; margin: 12px 0 0; }
.entry-trip-details strong { color: #536158; font-weight: 600; }
.entry-lures { display: flex; flex-wrap: wrap; gap: 0 5px; }
.entry-lures ul { list-style: none; margin: 0; padding: 0; }
.entry-lures li + li { margin-top: 3px; }
@media (max-width: 760px) {
  .toolbar-row { display: grid; gap: 8px; grid-template-columns: minmax(0,1fr) auto; }
  .search-box { max-width: none; min-width: 0; width: 100%; }
  .diary-count { grid-column: 1/-1; justify-self: end; margin-left: 0; }
  .entry-header { flex-direction: column; gap: 12px; }
  .entry-heading { min-width: 0; width: 100%; }
  .entry-heading > div:last-child { min-width: 0; }
  .entry-heading h2 { overflow-wrap: anywhere; }
  .entry-actions { justify-content: flex-start; width: 100%; }
}
@media (max-width: 500px) {
  .diary-entry { padding: 14px; }
  .entry-actions { gap: 7px; }
  .entry-action-button { min-height: 44px; }
}
</style>
