<script setup lang="ts">
// The trip shape is shared with the data composable and the trip-entry dialog.
import type { FishingCombo, FishingLure, FishingSpot, FishingTrip } from '../composables/useFishingData'
import { formatTripConditions } from '../utils/tripConditions'
import { formatCatchTime, getFishingInsights, getHourlyCatchTotals, getSeasonalCatchTrends } from '../utils/fishingInsights'

// Set browser metadata for the dashboard route.
useHead({ title: 'Overview · Tidelog', meta: [{ name: 'description', content: 'Your fishing diary, all in one place.' }] })

// The composable loads data for the authenticated user and persists new trips.
const { data, addTrip, addSpot, addCombo, isOnline, loading: dataLoading, error: dataError } = useFishingData()
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
const insights = computed(() => getFishingInsights(data.value.trips))
const hourlyCatchTotals = computed(() => getHourlyCatchTotals(data.value.trips))
const timedCatchCount = computed(() => hourlyCatchTotals.value.reduce((sum, item) => sum + item.quantity, 0))
const peakCatchHour = computed(() => hourlyCatchTotals.value.reduce(
  (peak, hour) => hour.quantity > peak.quantity ? hour : peak,
  { hour: 0, quantity: 0 }
))
const insightYears = computed(() => [...new Set(data.value.trips.map(trip => trip.date.slice(0, 4)))]
  .filter(year => /^\d{4}$/.test(year)).sort((a, b) => b.localeCompare(a)))
const seasonalYear = ref('')
watch(insightYears, (years) => {
  if (!years.includes(seasonalYear.value)) seasonalYear.value = years[0] ?? ''
}, { immediate: true })
const seasonalTrends = computed(() => getSeasonalCatchTrends(data.value.trips, seasonalYear.value))
const comparisonTripAId = ref('')
const comparisonTripBId = ref('')
watch(() => trips.value.map(trip => trip.id), (ids) => {
  if (!ids.includes(comparisonTripAId.value)) comparisonTripAId.value = ids[0] ?? ''
  if (!ids.includes(comparisonTripBId.value) || comparisonTripBId.value === comparisonTripAId.value) {
    comparisonTripBId.value = ids.find(id => id !== comparisonTripAId.value) ?? ''
  }
}, { immediate: true })
const comparisonTrips = computed(() => [
  trips.value.find(trip => trip.id === comparisonTripAId.value),
  trips.value.find(trip => trip.id === comparisonTripBId.value)
] as const)
const comparisonSpecies = computed(() => {
  const species = new Set(comparisonTrips.value.flatMap(trip => trip?.catches.map(item => item.species) ?? []))
  return [...species].map(name => ({
    name,
    counts: comparisonTrips.value.map(trip =>
      trip?.catches.filter(item => item.species === name).reduce((total, item) => total + item.quantity, 0) ?? 0
    )
  })).sort((a, b) => (b.counts[0] + b.counts[1]) - (a.counts[0] + a.counts[1]) || a.name.localeCompare(b.name))
})
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

// Formats the catch count for a trip; accepts the trip and returns a count label or "Skunked".
function catchSummary(trip: FishingTrip) {
  const count = trip.catches.reduce((sum, item) => sum + item.quantity, 0)
  if (count === 0) return 'Skunked'
  return `${count} ${count === 1 ? 'catch' : 'catches'}`
}

function comparisonDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
}

function formatPersonalBest(value: number, unit: 'cm' | 'kg') {
  return `${new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 }).format(value)} ${unit}`
}

function speciesBarWidth(quantity: number) {
  const maximum = insights.value.topSpecies[0]?.quantity ?? 1
  return `${Math.max(6, quantity / maximum * 100)}%`
}

function monthBarHeight(quantity: number) {
  const maximum = Math.max(1, ...seasonalTrends.value.months.map(month => month.quantity))
  return `${quantity === 0 ? 0 : Math.max(8, quantity / maximum * 100)}%`
}

function hourlyBarHeight(quantity: number) {
  const maximum = Math.max(1, ...hourlyCatchTotals.value.map(item => item.quantity))
  return `${quantity === 0 ? 0 : Math.max(8, quantity / maximum * 100)}%`
}

function tripTopSpecies(trip: FishingTrip) {
  const totals = new Map<string, number>()
  for (const item of trip.catches) totals.set(item.species, (totals.get(item.species) ?? 0) + item.quantity)
  return [...totals].sort((a, b) => b[1] - a[1])[0]
}

// Opens a clean new-trip dialog; takes no input and clears prior save feedback.
function openTripModal() {
  tripSaveError.value = null
  comboSaveError.value = null
  comboSaveSuccess.value = null
  tripModalOpen.value = true
}

// Formats a YYYY-MM-DD value at midday; accepts a date string and returns its day/month display labels.
function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
  }
}

// Saves the dialog draft; accepts trip/photo data and updates the page with success feedback or a save error.
async function saveTrip(
  trip: Omit<FishingTrip, 'id'>,
  photos: File[],
  catchPhotos: Array<File | null>,
  favoriteSpot?: Omit<FishingSpot, 'id'>
) {
  tripSaving.value = true
  tripSaveError.value = null
  try {
    const queued = await addTrip(trip, photos, catchPhotos)
    let favoriteSpotError = ''
    if (favoriteSpot) {
      try {
        await addSpot(favoriteSpot)
      } catch (error) {
        console.error('Trip saved, but the favorite spot could not be saved.', error)
        favoriteSpotError = error instanceof Error ? error.message : 'Could not save this favorite spot.'
      }
    }
    tripModalOpen.value = false
    toastMessage.value = favoriteSpotError
      ? `Trip saved, but the favorite spot could not be saved: ${favoriteSpotError}`
      : queued
        ? favoriteSpot ? 'Trip saved on this device; favorite spot saved to your map.' : 'Trip saved on this device and will sync when connected.'
        : favoriteSpot ? 'Trip added and favorite spot saved to your map.' : 'Trip added to your diary.'
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

// Persists a saved combo preset; accepts its fields and updates combo success/error state.
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

    <section class="insights-section" aria-label="Fishing insights">
      <div class="section-heading"><h2>Your fishing stats</h2><NuxtLink to="/logs">Explore your diary <span aria-hidden="true">→</span></NuxtLink></div>
      <div class="insights-grid">
        <article class="panel insight-card">
          <span class="insight-label">Species caught</span>
          <strong class="insight-number">{{ insights.speciesCount }}</strong>
          <span class="insight-caption">{{ insights.averageCatchesPerTrip.toFixed(1) }} fish per trip on average</span>
        </article>
        <article class="panel insight-card">
          <span class="insight-label">Personal best length</span>
          <strong class="insight-number">{{ insights.longestFish ? formatPersonalBest(insights.longestFish.value, 'cm') : '—' }}</strong>
          <span class="insight-caption" v-if="insights.longestFish">{{ insights.longestFish.species }} · {{ insights.longestFish.location }}</span>
          <span class="insight-caption" v-else>Add fish lengths to find your best.</span>
        </article>
        <article class="panel insight-card">
          <span class="insight-label">Personal best weight</span>
          <strong class="insight-number">{{ insights.heaviestFish ? formatPersonalBest(insights.heaviestFish.value, 'kg') : '—' }}</strong>
          <span class="insight-caption" v-if="insights.heaviestFish">{{ insights.heaviestFish.species }} · {{ insights.heaviestFish.location }}</span>
          <span class="insight-caption" v-else>Add fish weights to find your best.</span>
        </article>
        <article class="panel insight-card">
          <span class="insight-label">Best trip</span>
          <strong class="insight-number">{{ insights.bestTrip?.quantity ?? '—' }}<span v-if="insights.bestTrip"> fish</span></strong>
          <span class="insight-caption" v-if="insights.bestTrip">{{ insights.bestTrip.trip.location }} · {{ comparisonDate(insights.bestTrip.trip.date) }}</span>
          <span class="insight-caption" v-else>Log a catch to set a best trip.</span>
        </article>
      </div>
      <div class="species-leaderboard panel" v-if="insights.topSpecies.length">
        <div class="section-heading"><h3>Most caught species</h3><span>{{ insights.totalCatches }} fish total</span></div>
        <div v-for="item in insights.topSpecies" :key="item.species" class="species-stat-row">
          <strong>{{ item.species }}</strong>
          <span class="species-stat-track"><span :style="{ width: speciesBarWidth(item.quantity) }" /></span>
          <span class="species-stat-count">{{ item.quantity }}</span>
        </div>
      </div>
      <div class="catch-time-insights panel">
        <div class="section-heading catch-time-heading">
          <div><h3>Catch times</h3><span>{{ timedCatchCount }} fish with an approximate time</span></div>
          <strong v-if="timedCatchCount">
            Most recorded: {{ formatCatchTime(`${String(peakCatchHour.hour).padStart(2, '0')}:00`) }}
          </strong>
        </div>
        <div v-if="timedCatchCount" class="catch-time-chart-scroll" role="img" aria-label="Fish catches grouped by hour of day">
          <div class="catch-time-chart">
            <div
              v-for="hour in hourlyCatchTotals"
              :key="hour.hour"
              class="catch-time-column"
              :title="`${formatCatchTime(`${String(hour.hour).padStart(2, '0')}:00`)}: ${hour.quantity} fish`"
            >
              <span class="catch-time-count">{{ hour.quantity || '' }}</span>
              <span class="catch-time-track"><span :style="{ height: hourlyBarHeight(hour.quantity) }" /></span>
              <span class="catch-time-label">{{ hour.hour % 12 || 12 }}{{ hour.hour < 12 ? 'a' : 'p' }}</span>
            </div>
          </div>
        </div>
        <p v-else class="catch-time-empty">Add an approximate time to catches to see when you fish most successfully.</p>
      </div>
    </section>

    <section class="trip-comparison panel" aria-label="Compare fishing trips">
      <div class="comparison-heading">
        <div><p class="eyebrow">LEARN FROM YOUR LOGS</p><h2>Compare trips</h2><p>See how catches, conditions, and gear differed between days.</p></div>
        <NuxtLink to="/logs">View diary <span aria-hidden="true">→</span></NuxtLink>
      </div>
      <p v-if="trips.length < 2" class="comparison-empty">Log at least two trips to compare them here.</p>
      <template v-else>
        <div class="comparison-selectors">
          <label>First trip
            <select v-model="comparisonTripAId">
              <option v-for="trip in trips" :key="trip.id" :value="trip.id">{{ comparisonDate(trip.date) }} · {{ trip.location }}</option>
            </select>
          </label>
          <span aria-hidden="true">vs.</span>
          <label>Second trip
            <select v-model="comparisonTripBId">
              <option v-for="trip in trips" :key="trip.id" :value="trip.id">{{ comparisonDate(trip.date) }} · {{ trip.location }}</option>
            </select>
          </label>
        </div>
        <p v-if="comparisonTripAId === comparisonTripBId" class="comparison-empty">Choose two different trips to compare.</p>
        <div v-else-if="comparisonTrips[0] && comparisonTrips[1]" class="comparison-columns">
          <article v-for="(trip, index) in comparisonTrips" :key="trip.id" class="comparison-trip">
            <h3>{{ trip.location }}</h3>
            <span class="comparison-date">{{ comparisonDate(trip.date) }}</span>
            <div class="comparison-total"><strong>{{ trip.catches.reduce((total, item) => total + item.quantity, 0) }}</strong><span>fish caught</span></div>
            <p><strong>Top species:</strong> {{ tripTopSpecies(trip)?.[0] ?? 'None recorded' }}<span v-if="tripTopSpecies(trip)"> ({{ tripTopSpecies(trip)?.[1] }})</span></p>
            <p><strong>Conditions:</strong> {{ formatTripConditions(trip) || trip.conditions || 'Not recorded' }}</p>
            <p><strong>Gear:</strong> {{ [trip.rod, trip.reel, ...(trip.lures?.map(lure => lure.name) ?? [])].filter(Boolean).join(', ') || 'Not recorded' }}</p>
          </article>
        </div>
        <div v-if="comparisonSpecies.length && comparisonTripAId !== comparisonTripBId" class="comparison-species">
          <h3>Species by trip</h3>
          <div class="comparison-species-header">
            <span />
            <div class="comparison-trip-column">
              <strong>{{ comparisonTrips[0]?.location }}</strong>
              <span>{{ comparisonDate(comparisonTrips[0]!.date) }}</span>
            </div>
            <div class="comparison-trip-column">
              <strong>{{ comparisonTrips[1]?.location }}</strong>
              <span>{{ comparisonDate(comparisonTrips[1]!.date) }}</span>
            </div>
          </div>
          <div v-for="species in comparisonSpecies" :key="species.name" class="comparison-species-row">
            <span>{{ species.name }}</span><strong>{{ species.counts[0] }}</strong><strong>{{ species.counts[1] }}</strong>
          </div>
        </div>
      </template>
    </section>

    <section class="seasonal-insights panel" aria-label="Seasonal fishing trends">
      <div class="seasonal-heading">
        <div><p class="eyebrow">YOUR YEAR ON THE WATER</p><h2>Seasonal trends</h2></div>
        <label v-if="insightYears.length" class="seasonal-year-select">Year
          <select v-model="seasonalYear" aria-label="Year for seasonal trends">
            <option v-for="year in insightYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </label>
      </div>
      <p v-if="!insightYears.length" class="comparison-empty">Log a trip to start building your seasonal trends.</p>
      <template v-else>
        <div class="monthly-trend-chart" role="img" :aria-label="`Monthly catches in ${seasonalYear}`">
          <div v-for="month in seasonalTrends.months" :key="month.month" class="monthly-trend-column">
            <span class="monthly-trend-count">{{ month.quantity || '' }}</span>
            <span class="monthly-trend-track"><span :style="{ height: monthBarHeight(month.quantity) }" /></span>
            <span class="monthly-trend-label">{{ month.month }}</span>
          </div>
        </div>
        <div class="season-trend-grid">
          <article v-for="season in seasonalTrends.seasons" :key="season.season" class="season-trend-card">
            <div><strong>{{ season.season }}</strong><span>{{ season.quantity }} fish</span></div>
            <p>{{ season.topSpecies.length ? `Top: ${season.topSpecies.map(item => `${item.species} (${item.quantity})`).join(', ')}` : 'No catches recorded' }}</p>
          </article>
        </div>
      </template>
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
                <p>{{ formatTripConditions(trip) || 'A day out on the water' }}</p>
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
    :tacklebox-reels="data.tackleboxReels"
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
