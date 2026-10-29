<script setup lang="ts">
import type { FishingCombo, FishingLure, FishingTrip } from '../composables/useFishingData'
import { formatTripConditions } from '../utils/tripConditions'

useHead({ title: 'My diary · Tidelog', meta: [{ name: 'description', content: 'Browse and search your fishing trip diary.' }] })

const {
  data,
  addTrip,
  updateTrip,
  deleteTrip,
  discardPendingTrip,
  addCombo,
  pendingTripIds,
  syncingOfflineTrips,
  offlineSyncError,
  isOnline,
  syncPendingTrips,
  loading: dataLoading,
  error: dataError
} = useFishingData()
const { successFeedback } = useNativeFeatures()
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
const exportError = ref('')
const deletingTripId = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

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

const years = computed(() => [...new Set(data.value.trips.map(trip => trip.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)))
const filteredTrips = computed(() => [...data.value.trips]
  .filter((trip) => {
    const lureSearchText = [
      ...(trip.lures?.map(lure => `${lure.name} ${lure.notes}`) ?? []),
      ...trip.catches.map(item => item.lure ?? '')
    ].join(' ')
    const gearSearchText = `${trip.rod ?? ''} ${trip.reel ?? ''} ${trip.hook ?? ''} ${trip.line ?? ''} ${trip.weight ?? ''}`
    const catchSearchText = trip.catches
      .map(item => `${item.species} ${item.lure ?? ''} ${item.length ?? ''} ${item.weight ?? ''} ${item.released === undefined ? '' : item.released ? 'released' : 'kept'}`)
      .join(' ')
    const searchText = `${trip.location} ${formatTripConditions(trip)} ${lureSearchText} ${gearSearchText} ${trip.waterDepth ?? ''} ${trip.notes} ${catchSearchText}`.toLowerCase()
    return searchText.includes(query.value.toLowerCase()) && (yearFilter.value === 'all' || trip.date.startsWith(yearFilter.value))
  })
  .sort((a, b) => b.date.localeCompare(a.date)))

// Formats a trip's total catch count; accepts a trip and returns a count label or "Skunked".
function catchSummary(trip: FishingTrip) {
  const count = trip.catches.reduce((sum, item) => sum + item.quantity, 0)
  if (count === 0) return 'Skunked'
  return `${count} ${count === 1 ? 'catch' : 'catches'}`
}

// Triggers a browser download; accepts a filename, contents, and MIME type and releases the temporary URL.
function downloadExport(filename: string, contents: string, type: string) {
  const blobUrl = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

// Builds and downloads a PDF backup of the diary; takes no input and reports failures in export state.
async function exportPdf() {
  exportError.value = ''
  try {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 44
    const contentWidth = pageWidth - margin * 2
    let y = margin

    // Adds wrapped text to the current PDF page; accepts content/layout options and advances the PDF cursor.
    function addText(value: string, options: { bold?: boolean; size?: number; indent?: number; gapAfter?: number } = {}) {
      const { bold = false, size = 12, indent = 0, gapAfter = 3 } = options
      pdf.setFont('helvetica', bold ? 'bold' : 'normal')
      pdf.setFontSize(size)
      pdf.setTextColor(bold ? 49 : 83, bold ? 91 : 101, bold ? 70 : 91)
      const lines = pdf.splitTextToSize(value || '—', contentWidth - indent)
      const lineHeight = size * 1.45
      if (y + lines.length * lineHeight > pageHeight - margin) {
        pdf.addPage()
        y = margin
      }
      pdf.text(lines, margin + indent, y)
      y += lines.length * lineHeight + gapAfter
    }

    // Adds a titled section to the PDF; accepts a heading and writes it using the shared text layout helper.
    function addSection(title: string) {
      y += 7
      addText(title, { bold: true, size: 13, gapAfter: 7 })
    }

    addText('Tidelog fishing journal', { bold: true, size: 22, gapAfter: 5 })
    addText(`Exported ${new Date().toLocaleString()} · ${data.value.trips.length} trips`, { size: 12, gapAfter: 10 })

    addSection('Fishing trips')
    if (!data.value.trips.length) addText('No trips have been logged.')
    for (const trip of [...data.value.trips].sort((a, b) => b.date.localeCompare(a.date))) {
      const catchCount = trip.catches.reduce((sum, item) => sum + item.quantity, 0)
      addText(`${dateParts(trip.date).full} · ${trip.location}`, { bold: true, size: 12, gapAfter: 3 })
      addText([
        trip.conditions && `Conditions: ${trip.conditions}`,
        trip.airTemperature && `Air temperature: ${trip.airTemperature} °C`,
        trip.waterTemperature && `Water temperature: ${trip.waterTemperature} °C`,
        (trip.windSpeed || trip.windDirection) &&
          `Wind: ${[trip.windSpeed && `${trip.windSpeed} km/h`, trip.windDirection].filter(Boolean).join(' ')}`,
        trip.cloudCover && `Cloud cover: ${trip.cloudCover}`,
        trip.precipitation && `Precipitation: ${trip.precipitation}`,
        trip.rod && `Rod: ${trip.rod}`,
        trip.reel && `Reel: ${trip.reel}`,
        trip.hook && `Hook: ${trip.hook}`,
        trip.line && `Line: ${trip.line}`,
        trip.weight && `Weight: ${trip.weight}`,
        trip.waterDepth && `Water depth: ${trip.waterDepth}`
      ].filter(Boolean).join(' · ') || 'No conditions or gear details recorded.', { indent: 10 })
      addText(`Catches: ${catchCount || 'None'}`, { bold: true, indent: 10, gapAfter: 2 })
      for (const item of trip.catches) {
        const details = [
          `${item.quantity} ${item.quantity === 1 ? 'fish' : 'fish'}`,
          item.length && `Length ${item.length}`,
          item.weight && `Weight ${item.weight}`,
          item.released !== undefined && (item.released ? 'Released' : 'Kept'),
          item.lure && `Lure ${item.lure}`
        ].filter(Boolean).join(' · ')
        addText(`${item.species} — ${details}`, { indent: 18, gapAfter: 2 })
        if (item.photo) addText(`Fish photo: ${item.photo}`, { indent: 27, size: 12 })
      }
      if (trip.lures?.length) {
        addText(`Lures: ${trip.lures.map(lure => `${lure.name}${lure.notes ? ` (${lure.notes})` : ''}`).join('; ')}`, { indent: 10 })
      }
      if (trip.photos?.length) addText(`Trip photos: ${trip.photos.join('; ')}`, { indent: 10, size: 12 })
      if (trip.notes) addText(`Notes: ${trip.notes}`, { indent: 10 })
      y += 5
    }

    addSection('Tacklebox')
    if (!data.value.tackleboxLures.length && !data.value.tackleboxRods.length) addText('No saved lures or rods.')
    for (const lure of data.value.tackleboxLures) {
      addText(`Lure: ${lure.name}`, { bold: true, gapAfter: 2 })
      addText([
        lure.brand && `Brand: ${lure.brand}`,
        lure.type && `Type: ${lure.type}`,
        lure.color && `Color: ${lure.color}`,
        lure.size && `Size / weight: ${lure.size}`,
        lure.notes && `Notes: ${lure.notes}`
      ].filter(Boolean).join(' · ') || 'No additional details.', { indent: 10 })
    }
    for (const rod of data.value.tackleboxRods) {
      addText(`Rod: ${rod.name}`, { bold: true, gapAfter: 2 })
      addText([
        rod.brand && `Brand: ${rod.brand}`,
        rod.type && `Type: ${rod.type}`,
        rod.length && `Length: ${rod.length}`,
        rod.power && `Power: ${rod.power}`,
        rod.action && `Action: ${rod.action}`,
        rod.notes && `Notes: ${rod.notes}`
      ].filter(Boolean).join(' · ') || 'No additional details.', { indent: 10 })
    }

    addSection('Saved fishing spots')
    if (!data.value.spots.length) addText('No saved spots.')
    for (const spot of data.value.spots) {
      addText(spot.name, { bold: true, gapAfter: 2 })
      addText([
        spot.water && `Water: ${spot.water}`,
        spot.kind && `Type: ${spot.kind}`,
        `Coordinates: ${spot.latitude}, ${spot.longitude}`,
        spot.notes && `Notes: ${spot.notes}`
      ].filter(Boolean).join(' · '), { indent: 10 })
    }

    addSection('Saved combo presets')
    if (!data.value.combos.length) addText('No saved combo presets.')
    for (const combo of data.value.combos) {
      addText(combo.name, { bold: true, gapAfter: 2 })
      addText([
        combo.lures.length && `Lures: ${combo.lures.join(', ')}`,
        combo.hook && `Hook: ${combo.hook}`,
        combo.line && `Line: ${combo.line}`,
        combo.weight && `Weight: ${combo.weight}`
      ].filter(Boolean).join(' · ') || 'No setup details.', { indent: 10 })
    }

    if (data.value.hiddenTackleboxLures.length) {
      addSection('Hidden tacklebox entries')
      for (const key of data.value.hiddenTackleboxLures) addText(key, { indent: 10 })
    }

    const pageCount = pdf.getNumberOfPages()
    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(130, 144, 138)
      pdf.text(`Tidelog · ${page} / ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' })
    }
    pdf.save(`tidelog-export-${new Date().toISOString().slice(0, 10)}.pdf`)
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : 'Could not create the PDF export.'
  }
}

const csvColumns = [
  'record_type', 'id', 'trip_id', 'date', 'location', 'conditions', 'air_temperature_c', 'water_temperature_c',
  'wind_speed_kmh', 'wind_direction', 'cloud_cover', 'precipitation', 'species', 'quantity', 'length', 'fish_weight',
  'released', 'catch_photo', 'lure', 'lure_id', 'lure_notes', 'rod', 'hook', 'line', 'trip_weight', 'water_depth',
  'trip_notes', 'trip_photos', 'gear_type', 'name', 'brand', 'type', 'color', 'size', 'power', 'action', 'latitude',
  'longitude', 'water', 'kind', 'notes', 'combo_lures', 'hidden_lure_key'
]

// Serializes diary, tacklebox, and spot data as CSV and starts a download; takes no input.
function exportCsv() {
  type CsvValue = string | number | boolean | null | undefined
  const rows: Array<Record<string, CsvValue>> = []
  for (const trip of data.value.trips) {
    const tripFields = {
      trip_id: trip.id,
      date: trip.date,
      location: trip.location,
      conditions: trip.conditions,
      air_temperature_c: trip.airTemperature,
      water_temperature_c: trip.waterTemperature,
      wind_speed_kmh: trip.windSpeed,
      wind_direction: trip.windDirection,
      cloud_cover: trip.cloudCover,
      precipitation: trip.precipitation,
      rod: trip.rod,
      reel: trip.reel,
      hook: trip.hook,
      line: trip.line,
      trip_weight: trip.weight,
      water_depth: trip.waterDepth,
      trip_notes: trip.notes,
      trip_photos: JSON.stringify(trip.photos ?? [])
    }
    rows.push({ record_type: 'trip', id: trip.id, ...tripFields })
    for (const [index, item] of trip.catches.entries()) {
      rows.push({
        record_type: 'catch',
        id: `${trip.id}-catch-${index + 1}`,
        ...tripFields,
        species: item.species,
        quantity: item.quantity,
        length: item.length,
        fish_weight: item.weight,
        released: item.released,
        catch_photo: item.photo,
        lure: item.lure,
        lure_id: item.lureId
      })
    }
  }
  for (const lure of data.value.tackleboxLures) {
    rows.push({
      record_type: 'gear',
      id: lure.id,
      gear_type: 'lure',
      name: lure.name,
      brand: lure.brand,
      type: lure.type,
      color: lure.color,
      size: lure.size,
      notes: lure.notes
    })
  }
  for (const rod of data.value.tackleboxRods) {
    rows.push({
      record_type: 'gear',
      id: rod.id,
      gear_type: 'rod',
      name: rod.name,
      brand: rod.brand,
      type: rod.type,
      size: rod.length,
      power: rod.power,
      action: rod.action,
      notes: rod.notes
    })
  }
  for (const spot of data.value.spots) {
    rows.push({
      record_type: 'spot',
      id: spot.id,
      name: spot.name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      water: spot.water,
      kind: spot.kind,
      notes: spot.notes
    })
  }
  for (const combo of data.value.combos) {
    rows.push({
      record_type: 'combo',
      id: combo.id,
      name: combo.name,
      hook: combo.hook,
      line: combo.line,
      trip_weight: combo.weight,
      combo_lures: JSON.stringify(combo.lures)
    })
  }
  for (const key of data.value.hiddenTackleboxLures) {
    rows.push({ record_type: 'hidden_lure', hidden_lure_key: key })
  }
  // Escapes one CSV cell; accepts a nullable scalar and returns a valid quoted or plain field.
  const escapeCsv = (value: CsvValue) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const contents = [
    csvColumns.join(','),
    ...rows.map(row => csvColumns.map(column => escapeCsv(row[column])).join(','))
  ].join('\r\n')
  downloadExport(
    `tidelog-backup-${new Date().toISOString().slice(0, 10)}.csv`,
    `\uFEFF${contents}`,
    'text/csv;charset=utf-8'
  )
}

// Opens a blank trip dialog; takes no input and clears stale editing/save state.
function openNewTrip() {
  editingTrip.value = null
  tripSaveError.value = null
  comboSaveError.value = null
  comboSaveSuccess.value = null
  tripModalOpen.value = true
}

// Closes the trip dialog and clears its selected edit target; takes no input.
function closeTripModal() {
  tripModalOpen.value = false
  editingTrip.value = null
}

// Formats a YYYY-MM-DD diary date without timezone shifting; accepts the stored date and returns day/month/full labels.
function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en', { month: 'short' }).format(date),
    full: new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
  }
}

// Creates or updates a trip; accepts trip fields and photo files and reports save status to the diary.
async function saveTrip(trip: Omit<FishingTrip, 'id'>, photos: File[], catchPhotos: Array<File | null>) {
  tripSaving.value = true
  tripSaveError.value = null
  try {
    if (editingTrip.value) {
      await updateTrip(editingTrip.value.id, trip, catchPhotos)
      toastMessage.value = 'Trip updated.'
    } else {
      const queued = await addTrip(trip, photos, catchPhotos)
      toastMessage.value = queued
        ? 'Trip saved on this device and will sync when connected.'
        : 'Trip added to your diary.'
    }
    void successFeedback()
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

// Persists a combo preset; accepts combo fields and updates success/error state for the modal.
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

// Opens the trip dialog with an existing trip; accepts the selected trip and clears stale save errors.
function editTrip(trip: FishingTrip) {
  tripActionError.value = ''
  editingTrip.value = trip
  tripSaveError.value = null
  comboSaveError.value = null
  comboSaveSuccess.value = null
  tripModalOpen.value = true
}

// Confirms and deletes a saved or locally queued trip; accepts the trip and updates diary feedback.
async function removeTrip(trip: FishingTrip) {
  const isPending = pendingTripIds.value.includes(trip.id)
  const prompt = isPending
    ? `Discard the unsynced fishing trip at ${trip.location}? This removes it from this device.`
    : `Delete the fishing trip at ${trip.location}? This cannot be undone.`
  if (!window.confirm(prompt)) return

  deletingTripId.value = trip.id
  tripActionError.value = ''
  try {
    if (isPending) {
      await discardPendingTrip(trip.id)
      toastMessage.value = 'Unsynced trip discarded.'
    } else {
      await deleteTrip(trip.id)
      toastMessage.value = 'Trip deleted.'
    }
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
      <div class="heading-actions">
        <button class="secondary-button" type="button" :disabled="dataLoading" @click="exportCsv">Export CSV</button>
        <button class="secondary-button" type="button" :disabled="dataLoading" @click="exportPdf">Export PDF</button>
        <button class="primary-button" type="button" @click="openNewTrip"><span class="plus">＋</span> Log a trip</button>
      </div>
    </section>

    <div v-if="dataError" class="auth-message auth-error" role="alert">{{ dataError }}</div>
    <div v-if="tripActionError" class="auth-message auth-error" role="alert">{{ tripActionError }}</div>
    <div v-if="exportError" class="auth-message auth-error" role="alert">{{ exportError }}</div>
    <div v-if="!isOnline || pendingTripIds.length || offlineSyncError" class="offline-banner" :class="{ 'offline-banner-error': offlineSyncError }" role="status">
      <span class="offline-indicator" aria-hidden="true" />
      <span v-if="!isOnline">Offline — new trips are saved on this device and will sync when you reconnect.</span>
      <span v-else-if="syncingOfflineTrips">Syncing {{ pendingTripIds.length }} saved {{ pendingTripIds.length === 1 ? 'trip' : 'trips' }}…</span>
      <span v-else-if="offlineSyncError">{{ offlineSyncError }}</span>
      <span v-else>{{ pendingTripIds.length }} {{ pendingTripIds.length === 1 ? 'trip is' : 'trips are' }} saved on this device and waiting to sync.</span>
      <button
        v-if="isOnline && pendingTripIds.length && !syncingOfflineTrips"
        type="button"
        class="offline-sync-button"
        @click="syncPendingTrips"
      >Try sync</button>
    </div>

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
            <div><h2>{{ trip.location }}</h2><p>{{ dateParts(trip.date).full }} <span v-if="formatTripConditions(trip)"> · {{ formatTripConditions(trip) }}</span></p></div>
          </div>
          <div class="entry-actions">
            <span class="entry-weather">{{ catchSummary(trip) }}</span>
            <button class="entry-action-button" type="button" :disabled="!isOnline || pendingTripIds.includes(trip.id) || deletingTripId !== null || tripSaving" @click="editTrip(trip)">Edit</button>
            <button
              class="entry-action-button entry-delete-button"
              type="button"
              :disabled="deletingTripId !== null || tripSaving || (!isOnline && !pendingTripIds.includes(trip.id)) || (pendingTripIds.includes(trip.id) && syncingOfflineTrips)"
              :aria-label="`Delete trip at ${trip.location}`"
              @click="removeTrip(trip)"
            >{{ deletingTripId === trip.id ? 'Deleting…' : pendingTripIds.includes(trip.id) ? 'Discard' : 'Delete' }}</button>
          </div>
        </div>
        <p v-if="pendingTripIds.includes(trip.id)" class="pending-trip-note">Saved on this device · waiting to sync</p>
        <div v-if="trip.lures?.length || trip.rod || trip.reel || trip.hook || trip.line || trip.weight || trip.waterDepth" class="entry-trip-details">
          <div v-if="trip.lures?.length" class="entry-lures">
            <strong>Lures:</strong>
            <ul>
              <li v-for="(lure, index) in trip.lures" :key="`${lure.name}-${index}`">
                <span>{{ lure.name }}</span><span v-if="lure.notes"> — {{ lure.notes }}</span>
              </li>
            </ul>
          </div>
          <span v-if="trip.rod"><strong>Rod:</strong> {{ trip.rod }}</span>
          <span v-if="trip.reel"><strong>Reel:</strong> {{ trip.reel }}</span>
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
              <span v-if="item.lure" class="catch-lure">Caught on: {{ item.lure }}</span>
              <span v-if="item.length" class="catch-lure">Length: {{ item.length }}</span>
              <span v-if="item.weight" class="catch-lure">Weight: {{ item.weight }}</span>
              <span v-if="item.released !== undefined" class="catch-lure">{{ item.released ? 'Released' : 'Kept' }}</span>
              <a v-if="item.photo" class="catch-photo-link" :href="item.photo" target="_blank" rel="noreferrer">
                <img :src="item.photo" :alt="`${item.species} caught at ${trip.location}`" loading="lazy">
                <span>View fish photo</span>
              </a>
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
    :tacklebox-lures="data.tackleboxLures"
    :tacklebox-rods="data.tackleboxRods"
    :tacklebox-reels="data.tackleboxReels"
    :previous-lures="previousLures"
    :spots="data.spots"
    :spots-loading="dataLoading"
    :lures-loading="dataLoading"
    :saving="tripSaving"
    :save-error="tripSaveError"
    :saving-combo="comboSaving"
    :combo-save-error="comboSaveError"
    :combo-save-success="comboSaveSuccess"
    :offline-mode="!isOnline"
    @close="closeTripModal"
    @save="saveTrip"
    @save-combo="saveCombo"
  />
  <div v-if="toastMessage" class="toast" role="status">{{ toastMessage }}</div>
</template>

<style scoped>
.diary-count { color: #929d96; font-size: 12px; margin-left: auto; }
.offline-banner { align-items: center; background: #edf5ed; border: 1px solid #dbe8da; border-radius: 9px; color: #46694c; display: flex; flex-wrap: wrap; font-size: 12px; gap: 8px; line-height: 1.45; margin: 0 0 14px; padding: 10px 12px; }
.offline-banner-error { background: #fbf0ec; border-color: #f1ded6; color: #985b45; }
.offline-indicator { background: #6c9469; border-radius: 50%; flex: 0 0 8px; height: 8px; }
.offline-banner-error .offline-indicator { background: #b87558; }
.offline-sync-button { background: #fff; border: 1px solid #d5e1d4; border-radius: 6px; color: #46694c; font-size: 12px; margin-left: auto; min-height: 32px; padding: 4px 10px; }
.pending-trip-note { background: #f5f8f2; border-radius: 6px; color: #6a815e; font-size: 12px; margin: 10px 0 0; padding: 7px 9px; }
.heading-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.heading-actions .secondary-button { min-height: 38px; padding: 0 11px; }
.heading-actions .secondary-button:disabled { cursor: wait; opacity: .55; }
.entry-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.entry-action-button { background: #f7f8f5; border: 1px solid #e4e9e3; border-radius: 6px; color: #536158; cursor: pointer; font-size: 12px; min-height: 36px; padding: 5px 10px; }
.entry-action-button:hover:not(:disabled) { border-color: #a6b9a8; }
.entry-action-button:disabled { cursor: wait; opacity: .6; }
.entry-delete-button { color: #985b45; }
.entry-trip-details { align-items: flex-start; color: #718078; display: flex; flex-wrap: wrap; font-size: 12px; gap: 5px 18px; margin: 12px 0 0; }
.entry-trip-details strong { color: #536158; font-weight: 600; }
.entry-lures { display: flex; flex-wrap: wrap; gap: 0 5px; }
.entry-lures ul { list-style: none; margin: 0; padding: 0; }
.entry-lures li + li { margin-top: 3px; }
.catch-lure { color: #718078; font-size: 12px; }
.catch-photo-link { align-items: center; color: #477353; display: inline-flex; font-size: 12px; gap: 6px; margin-top: 3px; }
.catch-photo-link img { border-radius: 5px; height: 34px; object-fit: cover; width: 44px; }
@media (max-width: 760px) {
  .heading-actions { justify-content: flex-start; }
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
