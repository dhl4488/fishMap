<script setup lang="ts">
// The trip shape is shared with the data composable and the trip-entry dialog.
import type { FishingCombo, FishingLure, FishingTrip } from '../composables/useFishingData'

// Set browser metadata for the dashboard route.
useHead({ title: 'Overview · Tidelog', meta: [{ name: 'description', content: 'Your fishing diary, all in one place.' }] })

// The composable loads data for the authenticated user and persists new trips.
const { data, addTrip, addCombo, isOnline, loading: dataLoading, error: dataError } = useFishingData()
const { successFeedback } = useNativeFeatures()
// The profile name comes from the same shared Firebase session as the sidebar.
const { name } = useUserProfile()

// Local UI state controls the entry dialog and the result message after saving.
const tripModalOpen = ref(false)
const toastMessage = ref('')
const tripSaving = ref(false)
const tripSaveError = ref<string | null>(null)
const comboSaving = ref(false)
const comboSaveError = ref<string | null>(null)
const comboSaveSuccess = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

// Derive dashboard figures from the shared data so they update after a successful save.
const trips = computed(() => [...data.value.trips].sort((a, b) => b.date.localeCompare(a.date)))
const previousLures = computed(() => {
  const lures = new Map<string, FishingLure>()
  for (const trip of data.value.trips) {
    for (const lure of trip.lures ?? []) {
      const key = lure.name.trim().toLocaleLowerCase()
      if (key && !lures.has(key)) lures.set(key, lure)
    }
    for (const item of trip.catches) {
      const name = item.lure?.trim()
      const key = name?.toLocaleLowerCase()
      if (name && key && !lures.has(key)) lures.set(key, { name, notes: '' })
    }
  }
  return [...lures.values()]
})
const totalCatches = computed(() => data.value.trips.reduce((total, trip) => total + trip.catches.reduce((sum, item) => sum + item.quantity, 0), 0))
const lastTripDate = computed(() => trips.value[0]?.date)
// Use the first part of the account name for the greeting, with a safe fallback.
const firstName = computed(() => name.value.trim().split(/\s+/)[0] || 'Angler')

function catchSummary(trip: FishingTrip) {
  const count = trip.catches.reduce((sum, item) => sum + item.quantity, 0)
  if (count === 0) return 'Skunked'
  return `${count} ${count === 1 ? 'catch' : 'catches'}`
}

function openTripModal() {
  tripSaveError.value = null
  comboSaveError.value = null
  comboSaveSuccess.value = null
  tripModalOpen.value = true
}

// Format date-only strings at midday to avoid timezone conversion shifting the day.
function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
  }
}

// Save the dialog's draft through the user-scoped data composable.
async function saveTrip(trip: Omit<FishingTrip, 'id'>, photos: File[], catchPhotos: Array<File | null>) {
  tripSaving.value = true
  tripSaveError.value = null
  try {
    const queued = await addTrip(trip, photos, catchPhotos)
    tripModalOpen.value = false
    toastMessage.value = queued
      ? 'Trip saved on this device and will sync when connected.'
      : 'Trip added to your diary.'
    void successFeedback()
  } catch (error) {
    // Keep the dialog open if a photo upload or trip write fails, preserving the user's draft.
    tripSaveError.value = error instanceof Error ? error.message : 'Could not save this trip.'
  } finally {
    tripSaving.value = false
  }
  // Restart the dismissal timer so each new save result gets a full reading interval.
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

// Avoid leaving a pending timer behind if the user navigates away.
onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <!-- Dashboard combines account-level summaries with shortcuts to diary and map pages. -->
  <div class="page-wrap">
    <!-- Shared page header: current route and today's date. -->
    <header class="topbar">
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>Overview</strong></div>
      <div class="topbar-right">
        <span class="today-label">{{ new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()) }}</span>
      </div>
    </header>

    <!-- Welcome area also provides the primary action for logging a new trip. -->
    <section class="page-heading">
      <div>
        <p class="eyebrow">YOUR FISHING JOURNAL</p>
        <h1>Hello, {{ firstName }} <span aria-hidden="true">🎣 </span></h1>
        <p class="subtitle">Every day on the water has a story. Here's yours so far.</p>
      </div>
      <button class="primary-button" @click="openTripModal"><span class="plus">＋</span> Log a trip</button>
    </section>

    <!-- Surface Firestore load errors without hiding the rest of the page. -->
    <div v-if="dataError" class="auth-message auth-error" role="alert">{{ dataError }}</div>

    <!-- Aggregate counts give a quick summary of this account's saved fishing history. -->
    <section class="stats-grid" aria-label="Fishing statistics">
      <article class="stat-card">
        <div class="stat-top"><span>Days on the water</span><span class="stat-icon" aria-hidden="true">◷</span></div>
        <div class="stat-value"><strong>{{ data.trips.length }}</strong><span>trips logged</span></div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Catches recorded</span><span class="stat-icon" aria-hidden="true">⌁</span></div>
        <div class="stat-value"><strong>{{ totalCatches }}</strong><span>fish & counting</span></div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Favorite places</span><span class="stat-icon" aria-hidden="true">⌖</span></div>
        <div class="stat-value"><strong>{{ data.spots.length }}</strong><span>spot{{ data.spots.length === 1 ? '' : 's' }} saved</span></div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Last cast</span><span class="stat-icon" aria-hidden="true">↗</span></div>
        <div class="stat-value"><strong>{{ lastTripDate ? dateParts(lastTripDate).day : '—' }}</strong><span>{{ lastTripDate ? `${dateParts(lastTripDate).month} was a good one` : 'log your first trip' }}</span></div>
      </article>
    </section>

    <!-- The lower dashboard pairs a short trip history with saved fishing locations. -->
    <div class="dashboard-grid">
      <!-- Show the newest four trips; the diary page contains the complete history and search. -->
      <section>
        <div class="section-heading">
          <h2>Recent trips</h2>
          <NuxtLink to="/logs">View diary <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="panel" style="padding: 15px 18px">
          <!-- Loading and empty states distinguish pending data from a new diary. -->
          <div v-if="dataLoading" class="empty-state">Loading your trips…</div>
          <div v-else-if="trips.length" class="trip-list">
            <NuxtLink v-for="trip in trips.slice(0, 4)" :key="trip.id" to="/logs" class="trip-row">
              <div class="trip-date-box"><strong>{{ dateParts(trip.date).day }}</strong><span>{{ dateParts(trip.date).month }}</span></div>
              <div class="trip-row-main">
                <h3>{{ trip.location }}</h3>
                <p>{{ trip.conditions || 'A day out on the water' }}</p>
              </div>
              <span class="catch-count">{{ catchSummary(trip) }}</span>
            </NuxtLink>
          </div>
          <div v-else class="empty-state"><span>⌁</span>Your first fishing story starts here.</div>
        </div>
      </section>

      <!-- Saved spots link to the map for their coordinates and location context. -->
      <section>
        <div class="section-heading">
          <h2>Favorite spots</h2>
          <NuxtLink to="/maps">Open map <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div v-if="data.spots.length" class="spot-list">
          <NuxtLink v-for="spot in data.spots.slice(0, 3)" :key="spot.id" to="/maps" class="spot-card">
            <div class="spot-thumb" aria-hidden="true">⌖</div>
            <div><h3>{{ spot.name }}</h3><p>{{ spot.water }} · {{ spot.kind.split(' · ').at(-1) }}</p></div>
            <span class="spot-arrow" aria-hidden="true">›</span>
          </NuxtLink>
        </div>
        <div v-else class="panel empty-state">Save a favorite fishing spot on your map.</div>
      </section>
    </div>
  </div>

  <!-- The dialog owns draft fields; this page handles persistence and user feedback. -->
  <TripModal
    :model-value="tripModalOpen"
    :combos="data.combos"
    :tacklebox-lures="data.tackleboxLures"
    :tacklebox-rods="data.tackleboxRods"
    :previous-lures="previousLures"
    :spots="data.spots"
    :spots-loading="dataLoading"
    :lures-loading="dataLoading"
    :saving="tripSaving"
    :save-error="tripSaveError"
    :offline-mode="!isOnline"
    :saving-combo="comboSaving"
    :combo-save-error="comboSaveError"
    :combo-save-success="comboSaveSuccess"
    @close="tripModalOpen = false"
    @save="saveTrip"
    @save-combo="saveCombo"
  />
  <!-- Announce save results accessibly and dismiss the message after a short delay. -->
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>
