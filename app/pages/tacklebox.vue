<script setup lang="ts">
import type { TackleboxLure, TackleboxReel, TackleboxRod } from '../composables/useFishingData'
import { lureTypes, reelTypes, rodTypes } from '../utils/tackleboxGear'

useHead({ title: 'Tacklebox · Tidelog', meta: [{ name: 'description', content: 'Manage your lures, rods, and reels and see what you have caught with them.' }] })

const {
  data,
  loading,
  error,
  addTackleboxLure,
  updateTackleboxLure,
  removeTackleboxLure,
  addTackleboxRod,
  updateTackleboxRod,
  deleteTackleboxRod,
  addTackleboxReel,
  updateTackleboxReel,
  deleteTackleboxReel
} = useFishingData()

interface LureCatchSummary {
  species: string
  quantity: number
}

interface LureSummary {
  key: string
  name: string
  inventoryLure?: TackleboxLure
  icon?: string
  tripNotes: string[]
  tripIds: Set<string>
  lastUsed: string
  catches: Map<string, LureCatchSummary>
  totalCatches: number
}

interface GearTripSummary {
  tripCount: number
  lastUsed: string
  totalCatches: number
  species: LureCatchSummary[]
}

const lureModalOpen = ref(false)
const editingLure = ref<TackleboxLure | null>(null)
const lureFormIsEdit = ref(false)
const lureInitialName = ref('')
const savingLure = ref(false)
const deletingLureKey = ref<string | null>(null)
const actionError = ref('')
const successMessage = ref('')
const rodModalOpen = ref(false)
const editingRod = ref<TackleboxRod | null>(null)
const savingRod = ref(false)
const deletingRodId = ref<string | null>(null)
const rodActionError = ref('')
const reelModalOpen = ref(false)
const editingReel = ref<TackleboxReel | null>(null)
const savingReel = ref(false)
const deletingReelId = ref<string | null>(null)
const reelActionError = ref('')

// Resolves a lure's stable inventory/name key; accepts its name and optional ID and returns the canonical key.
function lureKey(name: string, inventoryLureId?: string) {
  if (inventoryLureId) return `id:${inventoryLureId}`
  const normalizedName = name.trim().toLocaleLowerCase()
  const inventoryItem = data.value.tackleboxLures.find(item => item.name.trim().toLocaleLowerCase() === normalizedName)
  return inventoryItem ? `id:${inventoryItem.id}` : `name:${normalizedName}`
}

// Aggregates inventory and trip history by lure; returns visible lure cards with trip and catch summaries.
const lureSummaries = computed(() => {
  const summaries = new Map<string, LureSummary>()

  // Retrieves or creates the summary matching a lure name or inventory ID.
  function ensureSummary(name: string, inventoryLure?: TackleboxLure, inventoryId?: string) {
    const key = lureKey(name, inventoryId ?? inventoryLure?.id)
    let summary = summaries.get(key)
    if (!summary) {
      summary = {
        key,
        name: inventoryLure?.name ?? name,
        inventoryLure,
        tripNotes: [],
        tripIds: new Set<string>(),
        lastUsed: '',
        catches: new Map<string, LureCatchSummary>(),
        totalCatches: 0
      }
      summaries.set(key, summary)
    }
    return summary
  }

  for (const inventoryLure of data.value.tackleboxLures) {
    ensureSummary(inventoryLure.name, inventoryLure)
  }

  for (const trip of data.value.trips) {
    const tripLureSummaries = new Map<string, LureSummary>()
    for (const lure of trip.lures ?? []) {
      const name = lure.name.trim()
      if (!name) continue
      const summary = ensureSummary(name, undefined, lure.inventoryLureId)
      tripLureSummaries.set(summary.key, summary)
      if (lure.notes.trim() && !summary.tripNotes.includes(lure.notes.trim())) {
        summary.tripNotes.push(lure.notes.trim())
      }
    }

    for (const item of trip.catches) {
      const name = item.lure?.trim()
      if (!name && !item.lureId) continue
      const summary = ensureSummary(name ?? '', undefined, item.lureId)
      tripLureSummaries.set(summary.key, summary)
      const species = summary.catches.get(item.species) ?? { species: item.species, quantity: 0 }
      species.quantity += item.quantity
      summary.catches.set(item.species, species)
      summary.totalCatches += item.quantity
    }

    for (const summary of tripLureSummaries.values()) {
      summary.tripIds.add(trip.id)
      if (!summary.lastUsed || trip.date > summary.lastUsed) summary.lastUsed = trip.date
    }
  }

  return [...summaries.values()]
    .filter(summary => !data.value.hiddenTackleboxLures.includes(summary.key))
    .map(summary => ({
      ...summary,
      icon: lureTypes.find(type => type.value === summary.inventoryLure?.type)?.icon,
      tripCount: summary.tripIds.size,
      species: [...summary.catches.values()].sort((a, b) => b.quantity - a.quantity || a.species.localeCompare(b.species))
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

// Summarizes trips and catches linked to a saved rod or reel; accepts gear identity and returns display-ready usage data.
function gearTripSummary(kind: 'rod' | 'reel', id: string, name: string): GearTripSummary {
  const normalizedName = name.trim().toLocaleLowerCase()
  const trips = data.value.trips.filter((trip) => {
    const tripGearId = kind === 'rod' ? trip.rodId : trip.reelId
    const tripGearName = kind === 'rod' ? trip.rod : trip.reel
    return tripGearId === id ||
      (!tripGearId && tripGearName?.trim().toLocaleLowerCase() === normalizedName)
  })
  const catches = new Map<string, LureCatchSummary>()

  for (const trip of trips) {
    for (const item of trip.catches) {
      const species = catches.get(item.species) ?? { species: item.species, quantity: 0 }
      species.quantity += item.quantity
      catches.set(item.species, species)
    }
  }

  return {
    tripCount: trips.length,
    lastUsed: trips.reduce((latest, trip) => trip.date > latest ? trip.date : latest, ''),
    totalCatches: [...catches.values()].reduce((total, item) => total + item.quantity, 0),
    species: [...catches.values()].sort((a, b) => b.quantity - a.quantity || a.species.localeCompare(b.species))
  }
}

// Builds rod cards with their usage summaries; returns gear fields alongside trip/catch history.
const rodCards = computed(() => data.value.tackleboxRods.map(rod => ({
  ...rod,
  icon: rodTypes.find(type => type.value === rod.type)?.icon,
  usage: gearTripSummary('rod', rod.id, rod.name)
})))

// Builds reel cards with their usage summaries; returns gear fields alongside trip/catch history.
const reelCards = computed(() => data.value.tackleboxReels.map(reel => ({
  ...reel,
  icon: reelTypes.find(type => type.value === reel.type)?.icon,
  usage: gearTripSummary('reel', reel.id, reel.name)
})))

// Opens a new or edit lure dialog; accepts an optional saved lure/name and populates the form state.
function openLureForm(lure: TackleboxLure | null = null, name = '') {
  editingLure.value = lure
  lureFormIsEdit.value = lure !== null || name !== ''
  lureInitialName.value = name
  actionError.value = ''
  successMessage.value = ''
  lureModalOpen.value = true
}

// Closes the lure dialog unless a save is in progress; takes no input and clears the active edit state.
function closeLureForm() {
  if (savingLure.value) return
  lureModalOpen.value = false
  editingLure.value = null
  lureFormIsEdit.value = false
  lureInitialName.value = ''
}

// Validates and persists the lure form; takes no input and updates success/error state after saving.
async function saveLure(lure: Omit<TackleboxLure, 'id'>) {
  savingLure.value = true
  actionError.value = ''
  try {
    if (editingLure.value) {
      await updateTackleboxLure(editingLure.value.id, lure)
      successMessage.value = 'Lure details updated.'
    } else {
      await addTackleboxLure(lure)
      successMessage.value = lureFormIsEdit.value ? 'Lure details saved to your tacklebox.' : 'Lure added to your tacklebox.'
    }
    lureModalOpen.value = false
    editingLure.value = null
    lureFormIsEdit.value = false
    lureInitialName.value = ''
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Could not save this lure.'
  } finally {
    savingLure.value = false
  }
}

// Confirms and removes/hides a lure from inventory; accepts its summary and preserves trip catch history.
async function removeLure(lure: LureSummary) {
  if (!window.confirm(`Remove "${lure.name}" from your tacklebox? It will be hidden here, but trip logs and catch history will be kept.`)) return

  deletingLureKey.value = lure.key
  actionError.value = ''
  successMessage.value = ''
  try {
    await removeTackleboxLure(lure.key, lure.name, lure.inventoryLure?.id)
    successMessage.value = 'Lure removed from your tacklebox. Trip logs and catch history were kept.'
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : 'Could not remove this lure.'
  } finally {
    deletingLureKey.value = null
  }
}

// Formats a stored date for display; accepts a YYYY-MM-DD value and returns a localized date string.
function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
}

// Opens a new or edit rod dialog; accepts an optional saved rod and populates the form state.
function openRodForm(rod: TackleboxRod | null = null) {
  editingRod.value = rod
  rodActionError.value = ''
  rodModalOpen.value = true
}

// Closes the rod dialog unless a save is in progress; takes no input and clears the active edit state.
function closeRodForm() {
  if (savingRod.value) return
  rodModalOpen.value = false
  editingRod.value = null
}

// Validates and persists the rod form; takes no input and reports the result through page state.
async function saveRod(rod: Omit<TackleboxRod, 'id'>) {
  savingRod.value = true
  rodActionError.value = ''
  try {
    if (editingRod.value) {
      await updateTackleboxRod(editingRod.value.id, rod)
      successMessage.value = 'Rod details updated.'
    } else {
      await addTackleboxRod(rod)
      successMessage.value = 'Rod added to your tacklebox.'
    }
    rodModalOpen.value = false
    editingRod.value = null
  } catch (error) {
    rodActionError.value = error instanceof Error ? error.message : 'Could not save this rod.'
  } finally {
    savingRod.value = false
  }
}

// Confirms and deletes a saved rod; accepts the rod and retains historical trip records.
async function removeRod(rod: TackleboxRod) {
  if (!window.confirm(`Remove "${rod.name}" from your tacklebox? Past trip logs will be kept.`)) return

  deletingRodId.value = rod.id
  rodActionError.value = ''
  try {
    await deleteTackleboxRod(rod.id)
    successMessage.value = 'Rod removed from your tacklebox. Trip history was kept.'
  } catch (error) {
    rodActionError.value = error instanceof Error ? error.message : 'Could not remove this rod.'
  } finally {
    deletingRodId.value = null
  }
}

// Opens a new or edit reel dialog; accepts an optional saved reel and populates the form state.
function openReelForm(reel: TackleboxReel | null = null) {
  editingReel.value = reel
  reelActionError.value = ''
  reelModalOpen.value = true
}

// Closes the reel dialog unless a save is in progress; takes no input and clears the active edit state.
function closeReelForm() {
  if (savingReel.value) return
  reelModalOpen.value = false
  editingReel.value = null
}

// Validates and persists the reel form; takes no input and reports the result through page state.
async function saveReel(reel: Omit<TackleboxReel, 'id'>) {
  savingReel.value = true
  reelActionError.value = ''
  try {
    if (editingReel.value) {
      await updateTackleboxReel(editingReel.value.id, reel)
      successMessage.value = 'Reel details updated.'
    } else {
      await addTackleboxReel(reel)
      successMessage.value = 'Reel added to your tacklebox.'
    }
    reelModalOpen.value = false
    editingReel.value = null
  } catch (error) {
    reelActionError.value = error instanceof Error ? error.message : 'Could not save this reel.'
  } finally {
    savingReel.value = false
  }
}

// Confirms and deletes a saved reel; accepts the reel and reports persistence errors through page state.
async function removeReel(reel: TackleboxReel) {
  if (!window.confirm(`Remove "${reel.name}" from your tacklebox?`)) return

  deletingReelId.value = reel.id
  reelActionError.value = ''
  try {
    await deleteTackleboxReel(reel.id)
    successMessage.value = 'Reel removed from your tacklebox.'
  } catch (error) {
    reelActionError.value = error instanceof Error ? error.message : 'Could not remove this reel.'
  } finally {
    deletingReelId.value = null
  }
}
</script>

<template>
  <div class="page-wrap">
    <header class="topbar">
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>Tacklebox</strong></div>
      <div class="topbar-right"><NuxtLink class="secondary-button" to="/logs">▤ &nbsp; View diary</NuxtLink></div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">WHAT'S BEEN WORKING</p>
        <h1>Your tacklebox</h1>
        <p class="subtitle">Keep track of your lures, rods, and reels, and see what you've caught with them.</p>
      </div>
    </section>

    <div v-if="error" class="auth-message auth-error" role="alert">{{ error }}</div>
    <div v-if="actionError && !lureModalOpen" class="auth-message auth-error" role="alert">{{ actionError }}</div>
    <div v-if="successMessage && !lureModalOpen" class="auth-message auth-success" role="status">{{ successMessage }}</div>
    <div v-if="rodActionError && !rodModalOpen" class="auth-message auth-error" role="alert">{{ rodActionError }}</div>
    <div v-if="reelActionError && !reelModalOpen" class="auth-message auth-error" role="alert">{{ reelActionError }}</div>

    <section class="rod-inventory">
      <div class="section-heading">
        <div><h2>Your rods</h2><p>Optionally add a rod to each trip log.</p></div>
        <button class="secondary-button" type="button" @click="openRodForm()">＋ Add a rod</button>
      </div>
      <div v-if="rodCards.length" class="rod-grid">
        <article v-for="rod in rodCards" :key="rod.id" class="panel lure-card">
          <header class="lure-card-header">
            <div class="lure-icon" aria-hidden="true">
              <img v-if="rod.icon" :src="asset(rod.icon)" alt="">
              <span v-else>🎣</span>
            </div>
            <div class="lure-title">
              <h2>{{ rod.name }}</h2>
              <p>Used on {{ rod.usage.tripCount }} {{ rod.usage.tripCount === 1 ? 'trip' : 'trips' }}</p>
            </div>
            <div class="lure-actions">
              <button class="lure-action" type="button" @click="openRodForm(rod)">Edit</button>
              <button
                class="lure-action lure-remove"
                type="button"
                :disabled="deletingRodId !== null"
                :aria-label="`Remove ${rod.name} from tacklebox`"
                @click="removeRod(rod)"
              >{{ deletingRodId === rod.id ? '…' : '×' }}</button>
              <div class="lure-total">
                <strong>{{ rod.usage.totalCatches }}</strong>
                <span>{{ rod.usage.totalCatches === 1 ? 'catch' : 'catches' }}</span>
              </div>
            </div>
          </header>

          <dl v-if="rod.brand || rod.type || rod.length || rod.power || rod.action" class="lure-details">
            <div v-if="rod.brand"><dt>Brand</dt><dd>{{ rod.brand }}</dd></div>
            <div v-if="rod.type"><dt>Type</dt><dd>{{ rod.type }}</dd></div>
            <div v-if="rod.length"><dt>Length</dt><dd>{{ rod.length }}</dd></div>
            <div v-if="rod.power"><dt>Power</dt><dd>{{ rod.power }}</dd></div>
            <div v-if="rod.action"><dt>Action</dt><dd>{{ rod.action }}</dd></div>
          </dl>

          <div v-if="rod.notes" class="lure-notes">
            <span class="detail-label">Notes</span>
            <span>{{ rod.notes }}</span>
          </div>

          <section class="species-results" :aria-label="`Catches with ${rod.name}`">
            <h3>What you've caught</h3>
            <ul v-if="rod.usage.species.length">
              <li v-for="item in rod.usage.species" :key="item.species">
                <span>{{ item.species }}</span>
                <strong>{{ item.quantity }} caught</strong>
              </li>
            </ul>
            <p v-else class="no-linked-catches">No catches linked to this rod yet. Select it when logging a trip to track its catches.</p>
          </section>

          <footer class="lure-card-footer">
            <span>{{ rod.usage.lastUsed ? `Last used ${formatDate(rod.usage.lastUsed)}` : 'Not used on a logged trip yet' }}</span>
            <NuxtLink to="/logs">View diary <span aria-hidden="true">→</span></NuxtLink>
          </footer>
        </article>
      </div>
      <p v-else class="rod-empty">No saved rods yet. You can add one here or enter a rod name directly when logging a trip.</p>
    </section>

    <section class="reel-inventory">
      <div class="section-heading">
        <div><h2>Your reels</h2><p>Keep track of the reels in your setup.</p></div>
        <button class="secondary-button" type="button" @click="openReelForm()">＋ Add a reel</button>
      </div>
      <div v-if="reelCards.length" class="reel-grid">
        <article v-for="reel in reelCards" :key="reel.id" class="panel lure-card">
          <header class="lure-card-header">
            <div class="lure-icon" aria-hidden="true">
              <img v-if="reel.icon" :src="asset(reel.icon)" alt="">
              <span v-else>◉</span>
            </div>
            <div class="lure-title">
              <h2>{{ reel.name }}</h2>
              <p>Used on {{ reel.usage.tripCount }} {{ reel.usage.tripCount === 1 ? 'trip' : 'trips' }}</p>
            </div>
            <div class="lure-actions">
              <button class="lure-action" type="button" @click="openReelForm(reel)">Edit</button>
              <button
                class="lure-action lure-remove"
                type="button"
                :disabled="deletingReelId !== null"
                :aria-label="`Remove ${reel.name} from tacklebox`"
                @click="removeReel(reel)"
              >{{ deletingReelId === reel.id ? '…' : '×' }}</button>
              <div class="lure-total">
                <strong>{{ reel.usage.totalCatches }}</strong>
                <span>{{ reel.usage.totalCatches === 1 ? 'catch' : 'catches' }}</span>
              </div>
            </div>
          </header>

          <dl v-if="reel.brand || reel.type || reel.size || reel.gearRatio || reel.retrieve" class="lure-details">
            <div v-if="reel.brand"><dt>Brand</dt><dd>{{ reel.brand }}</dd></div>
            <div v-if="reel.type"><dt>Type</dt><dd>{{ reel.type }}</dd></div>
            <div v-if="reel.size"><dt>Size</dt><dd>{{ reel.size }}</dd></div>
            <div v-if="reel.gearRatio"><dt>Gear ratio</dt><dd>{{ reel.gearRatio }}:1</dd></div>
            <div v-if="reel.retrieve"><dt>Retrieve</dt><dd>{{ reel.retrieve }}</dd></div>
          </dl>

          <div v-if="reel.notes" class="lure-notes">
            <span class="detail-label">Notes</span>
            <span>{{ reel.notes }}</span>
          </div>

          <section class="species-results" :aria-label="`Catches with ${reel.name}`">
            <h3>What you've caught</h3>
            <ul v-if="reel.usage.species.length">
              <li v-for="item in reel.usage.species" :key="item.species">
                <span>{{ item.species }}</span>
                <strong>{{ item.quantity }} caught</strong>
              </li>
            </ul>
            <p v-else class="no-linked-catches">No catches linked to this reel yet. Select it when logging a trip to track its catches.</p>
          </section>

          <footer class="lure-card-footer">
            <span>{{ reel.usage.lastUsed ? `Last used ${formatDate(reel.usage.lastUsed)}` : 'Not used on a logged trip yet' }}</span>
            <NuxtLink to="/logs">View diary <span aria-hidden="true">→</span></NuxtLink>
          </footer>
        </article>
      </div>
      <p v-else class="rod-empty">No saved reels yet. Add a reel to keep its specs handy.</p>
    </section>

    <section class="lure-inventory">
      <div class="section-heading">
        <div><h2>Your lures</h2><p>See which lures have been working on your trips.</p></div>
        <button class="secondary-button" type="button" @click="openLureForm()">＋ Add a lure</button>
      </div>
      <div v-if="loading" class="panel empty-state empty-panel">Loading your tacklebox…</div>
      <div v-else-if="lureSummaries.length" class="tackle-grid">
        <article v-for="lure in lureSummaries" :key="lure.key" class="panel lure-card">
          <header class="lure-card-header">
            <div class="lure-icon" aria-hidden="true">
              <img v-if="lure.icon" :src="asset(lure.icon)" alt="">
              <span v-else>⌁</span>
            </div>
            <div class="lure-title">
              <h2>{{ lure.name }}</h2>
              <p>Used on {{ lure.tripCount }} {{ lure.tripCount === 1 ? 'trip' : 'trips' }}</p>
            </div>
            <div class="lure-actions">
              <button class="lure-action" type="button" @click="openLureForm(lure.inventoryLure ?? null, lure.name)">Edit</button>
              <button
                class="lure-action lure-remove"
                type="button"
                :disabled="deletingLureKey !== null"
                :aria-label="`Remove ${lure.name} from tacklebox`"
                @click="removeLure(lure)"
              >{{ deletingLureKey === lure.key ? '…' : '×' }}</button>
              <div class="lure-total">
                <strong>{{ lure.totalCatches }}</strong>
                <span>{{ lure.totalCatches === 1 ? 'catch' : 'catches' }}</span>
              </div>
            </div>
          </header>

          <dl v-if="lure.inventoryLure && (lure.inventoryLure.brand || lure.inventoryLure.type || lure.inventoryLure.color || lure.inventoryLure.size)" class="lure-details">
            <div v-if="lure.inventoryLure.brand"><dt>Brand</dt><dd>{{ lure.inventoryLure.brand }}</dd></div>
            <div v-if="lure.inventoryLure.type"><dt>Type</dt><dd>{{ lure.inventoryLure.type }}</dd></div>
            <div v-if="lure.inventoryLure.color"><dt>Color</dt><dd><span class="color-dot" />{{ lure.inventoryLure.color }}</dd></div>
            <div v-if="lure.inventoryLure.size"><dt>Size / weight</dt><dd>{{ lure.inventoryLure.size }}</dd></div>
          </dl>

          <div v-if="lure.inventoryLure?.notes || lure.tripNotes.length" class="lure-notes">
            <span class="detail-label">Notes</span>
            <span v-if="lure.inventoryLure?.notes">{{ lure.inventoryLure.notes }}</span>
            <span v-if="lure.tripNotes.length" class="trip-notes">{{ lure.tripNotes.join(' · ') }}</span>
          </div>

          <section class="species-results" :aria-label="`Catches on ${lure.name}`">
            <h3>What you've caught</h3>
            <ul v-if="lure.species.length">
              <li v-for="item in lure.species" :key="item.species">
                <span>{{ item.species }}</span>
                <strong>{{ item.quantity }} caught</strong>
              </li>
            </ul>
            <p v-else class="no-linked-catches">No catches linked to this lure yet. Choose it from your tacklebox when logging a trip.</p>
          </section>

          <footer class="lure-card-footer">
            <span>{{ lure.lastUsed ? `Last used ${formatDate(lure.lastUsed)}` : 'Not used on a logged trip yet' }}</span>
            <NuxtLink to="/logs">View diary <span aria-hidden="true">→</span></NuxtLink>
          </footer>
        </article>
      </div>
      <div v-else class="panel empty-state empty-panel">
        <span>⌁</span>
        <strong>Your tacklebox is empty for now.</strong>
        <span>Add a lure to keep its color and other details, then select it when logging a trip.</span>
        <button class="primary-button" type="button" @click="openLureForm()">＋ Add your first lure</button>
      </div>
    </section>
  </div>

  <TackleboxGearModal
    v-if="lureModalOpen"
    kind="lure"
    :initial="editingLure"
    :initial-name="lureInitialName"
    :editing="lureFormIsEdit"
    :saving="savingLure"
    :error="actionError"
    @close="closeLureForm"
    @save-lure="saveLure"
  />
  <TackleboxGearModal
    v-if="rodModalOpen"
    kind="rod"
    :initial="editingRod"
    :editing="!!editingRod"
    :saving="savingRod"
    :error="rodActionError"
    @close="closeRodForm"
    @save-rod="saveRod"
  />
  <TackleboxGearModal
    v-if="reelModalOpen"
    kind="reel"
    :initial="editingReel"
    :editing="!!editingReel"
    :saving="savingReel"
    :error="reelActionError"
    @close="closeReelForm"
    @save-reel="saveReel"
  />
</template>

<style scoped>
.tackle-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.rod-inventory,.reel-inventory,.lure-inventory { background: #fff; border: 1px solid #e4e9e3; border-radius: 12px; margin: 0 0 20px; padding: 18px; }
.rod-inventory .section-heading,.reel-inventory .section-heading,.lure-inventory .section-heading { align-items: center; gap: 12px; }
.rod-inventory .section-heading h2,.reel-inventory .section-heading h2,.lure-inventory .section-heading h2 { font: 700 15px Manrope, sans-serif; margin: 0 0 4px; }
.rod-inventory .section-heading p,.reel-inventory .section-heading p,.lure-inventory .section-heading p { color: #89958e; font-size: 12px; margin: 0; }
.rod-inventory .section-heading .secondary-button,.reel-inventory .section-heading .secondary-button,.lure-inventory .section-heading .secondary-button { flex: 0 0 auto; white-space: nowrap; }
.rod-grid,.reel-grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.rod-empty { background: #f5f7f4; border-radius: 8px; color: #89958e; font-size: 12px; margin: 0; padding: 12px 14px; }
.lure-card { min-width: 0; overflow: hidden; padding: 17px; }
.lure-card-header { align-items: center; display: flex; gap: 11px; }
.lure-icon { align-items: center; background: #eaf2ec; border-radius: 10px; color: #4b765a; display: flex; flex: 0 0 42px; font-size: 23px; height: 42px; justify-content: center; }
.lure-icon img { height: 26px; width: 26px; }
.lure-title { min-width: 0; }
.lure-title h2 { font: 700 14px Manrope, sans-serif; margin: 0 0 4px; overflow-wrap: anywhere; }
.lure-title p { color: #8a9690; font-size: 12px; margin: 0; }
.lure-actions { align-items: center; display: flex; gap: 5px; margin-left: auto; }
.lure-action { background: #f7f8f5; border: 1px solid #e4e9e3; border-radius: 6px; color: #536158; font-size: 12px; min-height: 32px; padding: 4px 8px; }
.lure-action:hover:not(:disabled) { border-color: #a6b9a8; }
.lure-remove { color: #985b45; font-size: 17px; min-width: 32px; }
.lure-action:disabled { cursor: wait; opacity: .55; }
.lure-total { display: grid; margin-left: 5px; min-width: 40px; text-align: right; }
.lure-total strong { color: #315f48; font: 700 18px Manrope, sans-serif; }
.lure-total span { color: #8a9690; font-size: 12px; }
.lure-details { border-top: 1px solid #f0f2ee; display: grid; gap: 9px 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 14px 0 0; padding-top: 12px; }
.lure-details div { min-width: 0; }
.lure-details dt { color: #8a9690; font-size: 12px; margin-bottom: 3px; }
.lure-details dd { align-items: center; color: #536158; display: flex; font-size: 12px; gap: 6px; margin: 0; overflow-wrap: anywhere; }
.color-dot { background: #d9e4d9; border: 1px solid #c5d1c5; border-radius: 50%; flex: 0 0 10px; height: 10px; }
.lure-notes { border-top: 1px solid #f0f2ee; color: #718078; display: grid; font-size: 12px; gap: 5px; line-height: 1.5; margin-top: 14px; padding-top: 12px; }
.trip-notes { color: #89958e; }
.detail-label { color: #536158; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.species-results { border-top: 1px solid #f0f2ee; margin-top: 14px; padding-top: 12px; }
.species-results h3 { color: #536158; font-size: 12px; font-weight: 700; margin: 0 0 8px; }
.species-results ul { list-style: none; margin: 0; padding: 0; }
.species-results li { align-items: center; border-bottom: 1px solid #f4f5f2; color: #39483f; display: flex; font-size: 12px; justify-content: space-between; gap: 12px; padding: 8px 0; }
.species-results li:last-child { border-bottom: 0; }
.species-results li strong { color: #75827a; font-size: 12px; white-space: nowrap; }
.no-linked-catches { color: #8a9690; font-size: 12px; line-height: 1.55; margin: 0; }
.lure-card-footer { align-items: center; border-top: 1px solid #f0f2ee; color: #89958e; display: flex; font-size: 12px; justify-content: space-between; margin-top: 9px; padding-top: 11px; }
.lure-card-footer a { color: #63836d; font-size: 12px; font-weight: 600; }
.lure-card-footer a:hover { color: #244e3d; }
.empty-panel { gap: 9px; padding: 36px 20px; }
.empty-panel .primary-button { margin-top: 5px; }
.auth-success { background: #edf5ed; color: #426e4b; }
@media (max-width: 850px) {
  .tackle-grid,.rod-grid,.reel-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .lure-card { padding: 14px; }
  .lure-card-header { align-items: flex-start; flex-wrap: wrap; }
  .lure-actions { flex-wrap: wrap; }
}
</style>
