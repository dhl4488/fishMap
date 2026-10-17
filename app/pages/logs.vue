<script setup lang="ts">
import type { FishingTrip } from '../composables/useFishingData'

useHead({ title: 'My diary · Tidelog', meta: [{ name: 'description', content: 'Browse and search your fishing trip diary.' }] })

const { data, addTrip, loading: dataLoading, error: dataError } = useFishingData()
const tripModalOpen = ref(false)
const query = ref('')
const yearFilter = ref('all')
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

const years = computed(() => [...new Set(data.value.trips.map(trip => trip.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)))
const filteredTrips = computed(() => [...data.value.trips]
  .filter((trip) => {
    const searchText = `${trip.location} ${trip.conditions} ${trip.notes} ${trip.catches.map(item => item.species).join(' ')}`.toLowerCase()
    return searchText.includes(query.value.toLowerCase()) && (yearFilter.value === 'all' || trip.date.startsWith(yearFilter.value))
  })
  .sort((a, b) => b.date.localeCompare(a.date)))

function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
    full: new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
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
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>My diary</strong></div>
      <div class="topbar-right"><NuxtLink class="secondary-button" to="/maps">⌖ &nbsp; Find a spot</NuxtLink></div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">THE DAYS YOU'LL REMEMBER</p>
        <h1>My fishing diary</h1>
        <p class="subtitle">Little notes, big catches, and everything in between.</p>
      </div>
      <button class="primary-button" @click="tripModalOpen = true"><span class="plus">＋</span> Log a trip</button>
    </section>

    <div v-if="dataError" class="auth-message auth-error" role="alert">{{ dataError }}</div>

    <div class="toolbar-row">
      <label class="search-box">
        <span aria-hidden="true">⌕</span>
        <input v-model="query" aria-label="Search trips" placeholder="Search trips, places, or catches">
      </label>
      <select v-model="yearFilter" class="filter-select" aria-label="Filter trips by year">
        <option value="all">All years</option>
        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
      </select>
      <span style="color:#929d96;font-size:10px;margin-left:auto">{{ filteredTrips.length }} {{ filteredTrips.length === 1 ? 'entry' : 'entries' }}</span>
    </div>

    <div v-if="dataLoading" class="panel empty-state empty-panel">Loading your diary…</div>
    <div v-else-if="filteredTrips.length" class="diary-list">
      <article v-for="trip in filteredTrips" :key="trip.id" class="panel diary-entry">
        <div class="entry-header">
          <div class="entry-heading">
            <div class="trip-date-box"><strong>{{ dateParts(trip.date).day }}</strong><span>{{ dateParts(trip.date).month }}</span></div>
            <div><h2>{{ trip.location }}</h2><p>{{ dateParts(trip.date).full }} <span v-if="trip.conditions"> · {{ trip.conditions }}</span></p></div>
          </div>
          <span class="entry-weather">{{ trip.catches.reduce((sum, item) => sum + item.quantity, 0) }} catches</span>
        </div>
        <div v-if="trip.catches.length" class="entry-catches">
          <span v-for="(item, index) in trip.catches" :key="`${item.species}-${index}`" class="catch-chip">{{ item.species }} · {{ item.quantity }}</span>
        </div>
        <p v-if="trip.notes" class="entry-notes">{{ trip.notes }}</p>
      </article>
    </div>
    <div v-else class="panel empty-state empty-panel">
      <span>{{ query ? '⌕' : '⌁' }}</span>
      <strong>{{ query ? 'No trips match that search.' : 'No trips in your diary yet.' }}</strong>
      <span>{{ query ? 'Try another place, catch, or keyword.' : 'Log your first day on the water to get started.' }}</span>
      <button v-if="!query" class="primary-button" style="margin-top:6px" @click="tripModalOpen = true">Log a trip</button>
    </div>
  </div>

  <TripModal :model-value="tripModalOpen" @close="tripModalOpen = false" @save="saveTrip" />
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>
