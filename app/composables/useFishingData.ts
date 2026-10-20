import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import type { TidelogUser } from './useFirebaseAuth'
import { listOfflineTrips, removeOfflineTrip, saveOfflineTrip, type OfflineTripRecord } from './useOfflineTripQueue'

// Shared data shapes used by diary entries and saved map locations.
export interface FishingCatch {
  species: string
  quantity: number
  lure?: string
  lureId?: string
  length?: string
  weight?: string
  released?: boolean
  photo?: string
}

export interface FishingLure {
  name: string
  notes: string
  inventoryLureId?: string
}

export interface TackleboxLure {
  id: string
  name: string
  brand: string
  type: string
  color: string
  size: string
  notes: string
}

export interface TackleboxRod {
  id: string
  name: string
  brand: string
  type: string
  length: string
  power: string
  action: string
  notes: string
}

export interface FishingCombo {
  id: string
  name: string
  lures: string[]
  hook: string
  line: string
  weight: string
}

export interface FishingTrip {
  id: string
  date: string
  location: string
  catches: FishingCatch[]
  conditions: string
  lures?: FishingLure[]
  rod?: string
  rodId?: string
  hook?: string
  line?: string
  weight?: string
  waterDepth?: string
  notes: string
  photos?: string[]
}

export interface FishingSpot {
  id: string
  name: string
  water: string
  kind: string
  latitude: number
  longitude: number
  notes: string
}

interface SavedData {
  trips: FishingTrip[]
  spots: FishingSpot[]
  combos: FishingCombo[]
  tackleboxLures: TackleboxLure[]
  tackleboxRods: TackleboxRod[]
  hiddenTackleboxLures: string[]
}

// Validate Firestore payloads at the boundary before exposing them to the UI.
function isFishingCatch(value: unknown): value is FishingCatch {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return typeof item.species === 'string' &&
    typeof item.quantity === 'number' &&
    Number.isFinite(item.quantity) &&
    item.quantity >= 0 &&
    (item.lure === undefined || typeof item.lure === 'string') &&
    (item.lureId === undefined || typeof item.lureId === 'string') &&
    (item.length === undefined || typeof item.length === 'string') &&
    (item.weight === undefined || typeof item.weight === 'string') &&
    (item.released === undefined || typeof item.released === 'boolean') &&
    (item.photo === undefined || typeof item.photo === 'string')
}

function isFishingLure(value: unknown): value is FishingLure {
  if (typeof value !== 'object' || value === null) return false
  const lure = value as Record<string, unknown>
  return typeof lure.name === 'string' &&
    typeof lure.notes === 'string' &&
    (lure.inventoryLureId === undefined || typeof lure.inventoryLureId === 'string')
}

function isTackleboxLure(value: unknown): value is TackleboxLure {
  if (typeof value !== 'object' || value === null) return false
  const lure = value as Record<string, unknown>
  return typeof lure.id === 'string' &&
    typeof lure.name === 'string' &&
    typeof lure.brand === 'string' &&
    typeof lure.type === 'string' &&
    typeof lure.color === 'string' &&
    typeof lure.size === 'string' &&
    typeof lure.notes === 'string'
}

function isTackleboxRod(value: unknown): value is TackleboxRod {
  if (typeof value !== 'object' || value === null) return false
  const rod = value as Record<string, unknown>
  return typeof rod.id === 'string' &&
    typeof rod.name === 'string' &&
    typeof rod.brand === 'string' &&
    typeof rod.type === 'string' &&
    typeof rod.length === 'string' &&
    typeof rod.power === 'string' &&
    typeof rod.action === 'string' &&
    typeof rod.notes === 'string'
}

function isFishingTrip(value: unknown): value is FishingTrip {
  if (typeof value !== 'object' || value === null) return false
  const trip = value as Record<string, unknown>
  return typeof trip.id === 'string' &&
    typeof trip.date === 'string' &&
    typeof trip.location === 'string' &&
    Array.isArray(trip.catches) &&
    trip.catches.every(isFishingCatch) &&
    typeof trip.conditions === 'string' &&
    (trip.lures === undefined || (Array.isArray(trip.lures) && trip.lures.every(isFishingLure))) &&
    (trip.rod === undefined || typeof trip.rod === 'string') &&
    (trip.rodId === undefined || typeof trip.rodId === 'string') &&
    (trip.hook === undefined || typeof trip.hook === 'string') &&
    (trip.line === undefined || typeof trip.line === 'string') &&
    (trip.weight === undefined || typeof trip.weight === 'string') &&
    (trip.waterDepth === undefined || typeof trip.waterDepth === 'string') &&
    typeof trip.notes === 'string' &&
    (trip.photos === undefined || (Array.isArray(trip.photos) && trip.photos.every(photo => typeof photo === 'string')))
}

function isFishingCombo(value: unknown): value is FishingCombo {
  if (typeof value !== 'object' || value === null) return false
  const combo = value as Record<string, unknown>
  return typeof combo.id === 'string' &&
    typeof combo.name === 'string' &&
    Array.isArray(combo.lures) &&
    combo.lures.every(lure => typeof lure === 'string') &&
    typeof combo.hook === 'string' &&
    typeof combo.line === 'string' &&
    typeof combo.weight === 'string'
}

function isFishingSpot(value: unknown): value is FishingSpot {
  if (typeof value !== 'object' || value === null) return false
  const spot = value as Record<string, unknown>
  return typeof spot.id === 'string' &&
    typeof spot.name === 'string' &&
    typeof spot.water === 'string' &&
    typeof spot.kind === 'string' &&
    typeof spot.latitude === 'number' && Number.isFinite(spot.latitude) && spot.latitude >= -90 && spot.latitude <= 90 &&
    typeof spot.longitude === 'number' && Number.isFinite(spot.longitude) && spot.longitude >= -180 && spot.longitude <= 180 &&
    typeof spot.notes === 'string'
}

function isMissingStorageObject(error: unknown) {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'storage/object-not-found'
}

async function loadCollection<T>(
  db: Firestore,
  userId: string,
  collectionName: 'trips' | 'spots' | 'combos' | 'tackleboxLures' | 'tackleboxRods',
  isValid: (value: unknown) => value is T
): Promise<T[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, collectionName))
  return snapshot.docs.map((entry) => {
    const value: Record<string, unknown> = { ...entry.data(), id: entry.id }
    if (collectionName === 'trips' && typeof value.lures === 'string') {
      value.lures = value.lures.trim() ? [{ name: value.lures, notes: '' }] : []
    }
    if (!isValid(value)) throw new Error(`A saved ${collectionName} entry has an invalid format.`)
    return value
  })
}

async function loadHiddenTackleboxLures(db: Firestore, userId: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, 'hiddenTackleboxLures'))
  return snapshot.docs.map((entry) => {
    const key = entry.data().key
    if (typeof key !== 'string') throw new Error('A hidden tacklebox lure entry has an invalid format.')
    return key
  })
}

async function uploadCatchPhotos(
  storage: NonNullable<ReturnType<typeof useFirebaseStorage>>,
  userId: string,
  tripId: string,
  catches: FishingCatch[],
  photoFiles: Array<File | null>,
  uploadedReferences: ReturnType<typeof storageRef>[],
  stablePaths = false
): Promise<FishingCatch[]> {
  if (photoFiles.length !== catches.length) throw new Error('Catch photo data did not match the catch entries.')
  const selectedPhotos = photoFiles.filter((photo): photo is File => photo !== null)
  if (selectedPhotos.some(photo => !photo.type.startsWith('image/'))) throw new Error('Catch attachments must be image files.')
  if (selectedPhotos.some(photo => photo.size >= 10 * 1024 * 1024)) throw new Error('Each catch photo must be smaller than 10 MB.')

  const results = await Promise.allSettled(photoFiles.map(async (photo, index) => {
    const catchItem = catches[index]
    if (!catchItem) throw new Error('A catch photo did not match a catch entry.')
    if (!photo) return catchItem
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const photoName = stablePaths ? `${index}-${safeName}` : `${Date.now()}-${crypto.randomUUID()}-${index}-${safeName}`
    const reference = storageRef(storage, `users/${userId}/trips/${tripId}/catches/${photoName}`)
    uploadedReferences.push(reference)
    await uploadBytes(reference, photo, { contentType: photo.type })
    return { ...catchItem, photo: await getDownloadURL(reference) }
  }))
  const failedUpload = results.find(result => result.status === 'rejected')
  if (failedUpload?.status === 'rejected') throw failedUpload.reason
  return results.map((result) => {
    if (result.status !== 'fulfilled') throw result.reason
    return result.value
  })
}

async function persistTrip(
  db: Firestore,
  storage: NonNullable<ReturnType<typeof useFirebaseStorage>>,
  userId: string,
  tripId: string,
  trip: Omit<FishingTrip, 'id'>,
  photos: File[],
  catchPhotoFiles: Array<File | null>,
  stablePaths = false
): Promise<FishingTrip> {
  const uploadedReferences: ReturnType<typeof storageRef>[] = []
  try {
    const uploadResults = await Promise.allSettled(photos.map(async (photo, index) => {
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const photoName = stablePaths ? `photos/${index}-${safeName}` : `${Date.now()}-${index}-${safeName}`
      const reference = storageRef(storage, `users/${userId}/trips/${tripId}/${photoName}`)
      uploadedReferences.push(reference)
      await uploadBytes(reference, photo, { contentType: photo.type })
      return getDownloadURL(reference)
    }))
    const failedUpload = uploadResults.find(result => result.status === 'rejected')
    if (failedUpload?.status === 'rejected') throw failedUpload.reason
    const photoUrls = uploadResults
      .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
      .map(result => result.value)
    const catchRecords = await uploadCatchPhotos(storage, userId, tripId, trip.catches, catchPhotoFiles, uploadedReferences, stablePaths)
    const savedTrip = { ...trip, catches: catchRecords, photos: photoUrls }

    await setDoc(doc(db, 'users', userId, 'trips', tripId), {
      ...savedTrip,
      createdAt: serverTimestamp()
    })
    return { ...savedTrip, id: tripId }
  } catch (error) {
    await Promise.all(uploadedReferences.map(async (reference) => {
      try {
        await deleteObject(reference)
      } catch (cleanupError) {
        console.error('Could not remove an uploaded trip photo after the trip failed to save.', cleanupError)
      }
    }))
    throw error
  }
}

function isConnectionError(error: unknown) {
  if (!import.meta.client || !navigator.onLine) return true
  return typeof error === 'object' && error !== null && 'code' in error &&
    ['unavailable', 'deadline-exceeded', 'network-request-failed', 'storage/retry-limit-exceeded'].includes(String(error.code))
}

export function useFishingData() {
  const { user, initialize } = useFirebaseAuth()
  const data = useState<SavedData>('fishing-data', () => ({ trips: [], spots: [], combos: [], tackleboxLures: [], tackleboxRods: [], hiddenTackleboxLures: [] }))
  const loading = useState('fishing-data-loading', () => false)
  const error = useState<string | null>('fishing-data-error', () => null)
  const pendingTripIds = useState<string[]>('fishing-pending-trip-ids', () => [])
  const syncingOfflineTrips = useState('fishing-syncing-offline-trips', () => false)
  const offlineSyncError = useState<string | null>('fishing-offline-sync-error', () => null)
  const isOnline = useState('fishing-online', () => true)
  const { Network } = useNativeFeatures()
  const db = import.meta.client ? useFirebaseDatabase() : null
  const storage = import.meta.client ? useFirebaseStorage() : null

  async function syncPendingTrips() {
    const account = user.value
    if (!account || !db || !storage || !import.meta.client || !isOnline.value || syncingOfflineTrips.value) return
    syncingOfflineTrips.value = true
    offlineSyncError.value = null
    try {
      const queuedTrips = await listOfflineTrips(account.uid)
      for (const queued of queuedTrips) {
        if (!isOnline.value || user.value?.uid !== account.uid) break
        const savedTrip = await persistTrip(
          db,
          storage,
          account.uid,
          queued.tripId,
          queued.trip,
          queued.photos,
          queued.catchPhotoFiles,
          true
        )
        await removeOfflineTrip(account.uid, queued.tripId)
        if (user.value?.uid === account.uid) {
          data.value.trips = [savedTrip, ...data.value.trips.filter(trip => trip.id !== queued.tripId)]
          pendingTripIds.value = pendingTripIds.value.filter(id => id !== queued.tripId)
        }
      }
    } catch (caughtError) {
      console.error('Could not sync one or more offline fishing trips.', caughtError)
      offlineSyncError.value = 'A trip is still waiting to sync. Tidelog will retry when your connection is available.'
    } finally {
      syncingOfflineTrips.value = false
    }
  }

  async function discardPendingTrip(tripId: string) {
    const account = user.value
    if (!account) throw new Error('Sign in before discarding a locally saved fishing trip.')
    await removeOfflineTrip(account.uid, tripId)
    if (user.value?.uid === account.uid) {
      data.value.trips = data.value.trips.filter(trip => trip.id !== tripId)
      pendingTripIds.value = pendingTripIds.value.filter(id => id !== tripId)
    }
  }

  // Fetch only the signed-in account's subcollections and discard stale results after an account switch.
  async function loadUserData(account: TidelogUser | null) {
    data.value = { trips: [], spots: [], combos: [], tackleboxLures: [], tackleboxRods: [], hiddenTackleboxLures: [] }
    pendingTripIds.value = []
    error.value = null
    if (!account || !db) {
      loading.value = false
      return
    }

    loading.value = true
    let queuedTrips: OfflineTripRecord[] = []
    try {
      queuedTrips = await listOfflineTrips(account.uid)
      if (user.value?.uid === account.uid) {
        pendingTripIds.value = queuedTrips.map(trip => trip.tripId)
        data.value.trips = queuedTrips.map(queued => ({ ...queued.trip, id: queued.tripId }))
      }
    } catch (caughtError) {
      console.error('Could not load locally queued fishing trips.', caughtError)
      offlineSyncError.value = 'Could not access locally saved trips on this device.'
    }
    try {
      const [trips, spots, combos, tackleboxLures, tackleboxRods, hiddenTackleboxLures] = await Promise.all([
        loadCollection(db, account.uid, 'trips', isFishingTrip),
        loadCollection(db, account.uid, 'spots', isFishingSpot),
        loadCollection(db, account.uid, 'combos', isFishingCombo),
        loadCollection(db, account.uid, 'tackleboxLures', isTackleboxLure),
        loadCollection(db, account.uid, 'tackleboxRods', isTackleboxRod),
        loadHiddenTackleboxLures(db, account.uid)
      ])
      if (user.value?.uid === account.uid) {
        const pendingIds = new Set(queuedTrips.map(trip => trip.tripId))
        data.value = {
          trips: [...queuedTrips.map(queued => ({ ...queued.trip, id: queued.tripId })), ...trips.filter(trip => !pendingIds.has(trip.id))],
          spots,
          combos,
          tackleboxLures,
          tackleboxRods,
          hiddenTackleboxLures
        }
      }
      if (isOnline.value) void syncPendingTrips()
    } catch (caughtError) {
      console.error('Could not load this user’s fishing data from Firestore.', caughtError)
      if (user.value?.uid === account.uid) {
        error.value = import.meta.client && !navigator.onLine
          ? 'Offline: previously synced trips, spots, and tacklebox details are not cached. You can still save new trip logs on this device.'
          : 'Could not load your trips, spots, combos, and tacklebox. Please try reloading the page.'
      }
    } finally {
      if (user.value?.uid === account.uid) loading.value = false
    }
  }

  if (import.meta.client) {
    void initialize()
    watch(user, account => void loadUserData(account), { immediate: true })
    isOnline.value = navigator.onLine
    const handleOnline = () => {
      isOnline.value = true
      void syncPendingTrips()
    }
    const handleOffline = () => { isOnline.value = false }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    let disposed = false
    let removeNativeNetworkListener: (() => void) | undefined
    void Network.getStatus().then(status => {
      if (!disposed) {
        isOnline.value = status.connected
        if (status.connected) void syncPendingTrips()
      }
    }).catch((caughtError: unknown) => {
      console.warn('Native network status could not be read; using browser connectivity events.', caughtError)
    })
    void Network.addListener('networkStatusChange', status => {
      isOnline.value = status.connected
      if (status.connected) void syncPendingTrips()
    }).then(listener => {
      if (disposed) void listener.remove()
      else removeNativeNetworkListener = () => { void listener.remove() }
    }).catch((caughtError: unknown) => {
      console.warn('Native network changes could not be monitored; using browser connectivity events.', caughtError)
    })
    onScopeDispose(() => {
      disposed = true
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      removeNativeNetworkListener?.()
    })
  }

  // Firestore paths are scoped by Firebase UID, so saved data cannot be mixed between accounts.
  async function addTrip(
    trip: Omit<FishingTrip, 'id'>,
    photos: File[] = [],
    catchPhotoFiles: Array<File | null> = trip.catches.map(() => null)
  ): Promise<boolean> {
    const account = user.value
    if (!account || !db || !storage) throw new Error('Sign in before saving a fishing trip.')
    if (photos.length > 6) throw new Error('You can attach up to 6 photos per trip.')
    if (photos.some(photo => !photo.type.startsWith('image/'))) throw new Error('Trip attachments must be image files.')
    if (photos.some(photo => photo.size >= 10 * 1024 * 1024)) throw new Error('Each trip photo must be smaller than 10 MB.')
    if (catchPhotoFiles.length !== trip.catches.length) throw new Error('Catch photo data did not match the catch entries.')
    if (catchPhotoFiles.some(photo => photo && !photo.type.startsWith('image/'))) throw new Error('Catch attachments must be image files.')
    if (catchPhotoFiles.some(photo => photo && photo.size >= 10 * 1024 * 1024)) throw new Error('Each catch photo must be smaller than 10 MB.')

    const tripId = crypto.randomUUID()
    const queueTrip = async () => {
      const queued: OfflineTripRecord = {
        key: `${account.uid}:${tripId}`,
        userId: account.uid,
        tripId,
        trip,
        photos,
        catchPhotoFiles,
        queuedAt: Date.now()
      }
      await saveOfflineTrip(queued)
      if (user.value?.uid === account.uid) {
        data.value.trips.unshift({ ...trip, id: tripId })
        pendingTripIds.value = [...pendingTripIds.value, tripId]
      }
    }

    if (!isOnline.value) {
      await queueTrip()
      return true
    }
    try {
      const savedTrip = await persistTrip(db, storage, account.uid, tripId, trip, photos, catchPhotoFiles, true)
      if (user.value?.uid === account.uid) data.value.trips.unshift(savedTrip)
      return false
    } catch (error) {
      if (isConnectionError(error)) {
        await queueTrip()
        return true
      }
      throw error
    }
  }

  async function updateTrip(
    tripId: string,
    trip: Omit<FishingTrip, 'id' | 'photos'>,
    catchPhotoFiles: Array<File | null> = trip.catches.map(() => null)
  ) {
    const account = user.value
    if (!account || !db || !storage) throw new Error('Sign in before updating a fishing trip.')
    const previousTrip = data.value.trips.find(savedTrip => savedTrip.id === tripId)
    const uploadedReferences: ReturnType<typeof storageRef>[] = []
    let savedCatches: FishingCatch[]

    try {
      savedCatches = await uploadCatchPhotos(storage, account.uid, tripId, trip.catches, catchPhotoFiles, uploadedReferences)
      await updateDoc(doc(db, 'users', account.uid, 'trips', tripId), { ...trip, catches: savedCatches })
    } catch (error) {
      await Promise.all(uploadedReferences.map(async (reference) => {
        try {
          await deleteObject(reference)
        } catch (cleanupError) {
          console.error('Could not remove an uploaded catch photo after the trip failed to save.', cleanupError)
        }
      }))
      throw error
    }
    if (user.value?.uid === account.uid) {
      data.value.trips = data.value.trips.map(savedTrip =>
        savedTrip.id === tripId ? { ...savedTrip, ...trip, catches: savedCatches } : savedTrip
      )
    }

    const retainedPhotos = new Set(savedCatches.map(item => item.photo).filter((photo): photo is string => Boolean(photo)))
    const removedPhotos = [...new Set((previousTrip?.catches ?? [])
      .map(item => item.photo)
      .filter((photo): photo is string => typeof photo === 'string' && !retainedPhotos.has(photo)))]
    const cleanupResults = await Promise.allSettled(removedPhotos.map(photo => deleteObject(storageRef(storage, photo))))
    const failedCleanup = cleanupResults.filter(result =>
      result.status === 'rejected' && !isMissingStorageObject(result.reason)
    )
    if (failedCleanup.length) {
      console.error('Could not remove one or more replaced catch photos after updating a fishing trip.', failedCleanup)
      throw new Error('Trip saved, but some replaced catch photos could not be removed.')
    }
  }

  async function deleteTrip(tripId: string) {
    const account = user.value
    if (!account || !db || !storage) throw new Error('Sign in before deleting a fishing trip.')
    const trip = data.value.trips.find(savedTrip => savedTrip.id === tripId)

    await deleteDoc(doc(db, 'users', account.uid, 'trips', tripId))
    if (user.value?.uid === account.uid) {
      data.value.trips = data.value.trips.filter(savedTrip => savedTrip.id !== tripId)
    }

    const photoUrls = [...new Set([
      ...(trip?.photos ?? []),
      ...(trip?.catches.map(item => item.photo).filter((photo): photo is string => Boolean(photo)) ?? [])
    ])]
    if (photoUrls.length) {
      const results = await Promise.allSettled(
        photoUrls.map(photo => deleteObject(storageRef(storage, photo)))
      )
      const failedDeletions = results.filter(result =>
        result.status === 'rejected' && !isMissingStorageObject(result.reason)
      )
      if (failedDeletions.length) {
        console.error('Could not remove one or more photos after deleting a fishing trip.', failedDeletions)
        throw new Error('Trip deleted, but some photos could not be removed.')
      }
    }
  }

  async function addSpot(spot: Omit<FishingSpot, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before saving a fishing spot.')
    const saved = await addDoc(collection(db, 'users', account.uid, 'spots'), {
      ...spot,
      createdAt: serverTimestamp()
    })
    if (user.value?.uid === account.uid) data.value.spots.unshift({ ...spot, id: saved.id })
  }

  async function deleteSpot(spotId: string) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before deleting a fishing spot.')

    await deleteDoc(doc(db, 'users', account.uid, 'spots', spotId))
    if (user.value?.uid === account.uid) {
      data.value.spots = data.value.spots.filter(spot => spot.id !== spotId)
    }
  }

  async function addTackleboxLure(lure: Omit<TackleboxLure, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before adding a lure to your tacklebox.')
    const saved = await addDoc(collection(db, 'users', account.uid, 'tackleboxLures'), {
      ...lure,
      createdAt: serverTimestamp()
    })
    if (user.value?.uid === account.uid) data.value.tackleboxLures.unshift({ ...lure, id: saved.id })
  }

  async function updateTackleboxLure(lureId: string, lure: Omit<TackleboxLure, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before updating a tacklebox lure.')
    await updateDoc(doc(db, 'users', account.uid, 'tackleboxLures', lureId), lure)
    if (user.value?.uid === account.uid) {
      data.value.tackleboxLures = data.value.tackleboxLures.map(savedLure =>
        savedLure.id === lureId ? { ...savedLure, ...lure } : savedLure
      )
    }
  }

  async function removeTackleboxLure(key: string, name: string, lureId?: string) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before removing a lure from your tacklebox.')

    const normalizedName = name.trim().toLocaleLowerCase()
    const hiddenKeys = [...new Set([
      key,
      ...(normalizedName ? [`name:${normalizedName}`] : []),
      ...(lureId ? [`id:${lureId}`] : [])
    ])]
    const batch = writeBatch(db)
    for (const hiddenKey of hiddenKeys) {
      batch.set(
        doc(db, 'users', account.uid, 'hiddenTackleboxLures', encodeURIComponent(hiddenKey)),
        { key: hiddenKey, createdAt: serverTimestamp() }
      )
    }
    if (lureId) batch.delete(doc(db, 'users', account.uid, 'tackleboxLures', lureId))
    await batch.commit()

    if (user.value?.uid === account.uid) {
      data.value.hiddenTackleboxLures = [...new Set([...data.value.hiddenTackleboxLures, ...hiddenKeys])]
      if (lureId) {
        data.value.tackleboxLures = data.value.tackleboxLures.filter(lure => lure.id !== lureId)
      }
    }
  }

  async function addTackleboxRod(rod: Omit<TackleboxRod, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before adding a rod to your tacklebox.')
    const saved = await addDoc(collection(db, 'users', account.uid, 'tackleboxRods'), {
      ...rod,
      createdAt: serverTimestamp()
    })
    if (user.value?.uid === account.uid) data.value.tackleboxRods.unshift({ ...rod, id: saved.id })
  }

  async function updateTackleboxRod(rodId: string, rod: Omit<TackleboxRod, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before updating a tacklebox rod.')
    await updateDoc(doc(db, 'users', account.uid, 'tackleboxRods', rodId), rod)
    if (user.value?.uid === account.uid) {
      data.value.tackleboxRods = data.value.tackleboxRods.map(savedRod =>
        savedRod.id === rodId ? { ...savedRod, ...rod } : savedRod
      )
    }
  }

  async function deleteTackleboxRod(rodId: string) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before deleting a tacklebox rod.')
    await deleteDoc(doc(db, 'users', account.uid, 'tackleboxRods', rodId))
    if (user.value?.uid === account.uid) {
      data.value.tackleboxRods = data.value.tackleboxRods.filter(rod => rod.id !== rodId)
    }
  }

  async function addCombo(combo: Omit<FishingCombo, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before saving a fishing combo.')
    const saved = await addDoc(collection(db, 'users', account.uid, 'combos'), {
      ...combo,
      createdAt: serverTimestamp()
    })
    if (user.value?.uid === account.uid) data.value.combos.unshift({ ...combo, id: saved.id })
  }

  return {
    data,
    loading,
    error,
    pendingTripIds,
    syncingOfflineTrips,
    offlineSyncError,
    isOnline,
    syncPendingTrips,
    discardPendingTrip,
    addTrip,
    updateTrip,
    deleteTrip,
    addSpot,
    deleteSpot,
    addTackleboxLure,
    updateTackleboxLure,
    removeTackleboxLure,
    addTackleboxRod,
    updateTackleboxRod,
    deleteTackleboxRod,
    addCombo
  }
}
