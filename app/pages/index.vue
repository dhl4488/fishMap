<script setup lang="ts">
import type { FishingTrip } from '../composables/useFishingData'

useHead({ title: 'Overview · Tidelog', meta: [{ name: 'description', content: 'Your fishing diary, all in one place.' }] })

const { data, addTrip, loading: dataLoading, error: dataError } = useFishingData()
const { name } = useUserProfile()
const tripModalOpen = ref(false)
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const trips = computed(() => [...data.value.trips].sort((a, b) => b.date.localeCompare(a.date)))
const totalCatches = computed(() => data.value.trips.reduce((total, trip) => total + trip.catches.reduce((sum, item) => sum + item.quantity, 0), 0))
const lastTripDate = computed(() => trips.value[0]?.date)
const firstName = computed(() => name.value.trim().split(/\s+/)[0] || 'Angler')

function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
  }
}

async function saveTrip(trip: Omit<FishingTrip, 'id'>) {
  try {
    await addTrip(trip)
    tripModalOpen.value = false
    toastMessage.value = 'Trip added to your diary.'
  } catch (error) {
    toastMessage.value = error instanceof Error ? error.message : 'Could not save this trip.'
  }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2800)
}

onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <div class="page-wrap">
    <header class="topbar">
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>Overview</strong></div>
      <div class="topbar-right">
        <span class="today-label">{{ new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()) }}</span>
        <button class="icon-button" aria-label="Notifications"><span aria-hidden="true">♧</span><i class="notification-dot" /></button>
      </div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">YOUR FISHING JOURNAL</p>
        <h1>Good morning, {{ firstName }} <span aria-hidden="true">☀</span></h1>
        <p class="subtitle">Every day on the water has a story. Here's yours so far.</p>
      </div>
      <button class="primary-button" @click="tripModalOpen = true"><span class="plus">＋</span> Log a trip</button>
    </section>

    <div v-if="dataError" class="auth-message auth-error" role="alert">{{ dataError }}</div>

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
        <div class="stat-value"><strong>{{ data.spots.length }}</strong><span>spots saved</span></div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span>Last cast</span><span class="stat-icon" aria-hidden="true">↗</span></div>
        <div class="stat-value"><strong>{{ lastTripDate ? dateParts(lastTripDate).day : '—' }}</strong><span>{{ lastTripDate ? `${dateParts(lastTripDate).month} was a good one` : 'log your first trip' }}</span></div>
      </article>
    </section>

    <div class="dashboard-grid">
      <section>
        <div class="section-heading">
          <h2>Recent trips</h2>
          <NuxtLink to="/logs">View diary <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div class="panel" style="padding: 15px 18px">
          <div v-if="dataLoading" class="empty-state">Loading your trips…</div>
          <div v-else-if="trips.length" class="trip-list">
            <NuxtLink v-for="trip in trips.slice(0, 4)" :key="trip.id" to="/logs" class="trip-row">
              <div class="trip-date-box"><strong>{{ dateParts(trip.date).day }}</strong><span>{{ dateParts(trip.date).month }}</span></div>
              <div class="trip-row-main">
                <h3>{{ trip.location }}</h3>
                <p>{{ trip.conditions || 'A day out on the water' }}</p>
              </div>
              <span class="catch-count">{{ trip.catches.reduce((sum, item) => sum + item.quantity, 0) }} catches</span>
            </NuxtLink>
          </div>
          <div v-else class="empty-state"><span>⌁</span>Your first fishing story starts here.</div>
        </div>
      </section>

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
          <NuxtLink to="/maps" class="dashboard-map-link">Explore your fishing map <span aria-hidden="true">→</span></NuxtLink>
        </div>
        <div v-else class="panel empty-state">Save a favorite fishing spot on your map.</div>
      </section>
    </div>
  </div>

  <TripModal :model-value="tripModalOpen" @close="tripModalOpen = false" @save="saveTrip" />
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>
