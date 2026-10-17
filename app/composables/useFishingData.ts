import {
  addDoc,
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  type Firestore
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import type { TidelogUser } from './useFirebaseAuth'

// Shared data shapes used by diary entries and saved map locations.
export interface FishingCatch {
  species: string
  quantity: number
}

export interface FishingTrip {
  id: string
  date: string
  location: string
  catches: FishingCatch[]
  conditions: string
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
}

// Validate Firestore payloads at the boundary before exposing them to the UI.
function isFishingCatch(value: unknown): value is FishingCatch {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Record<string, unknown>
  return typeof item.species === 'string' && typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0
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
    typeof trip.notes === 'string' &&
    (trip.photos === undefined || (Array.isArray(trip.photos) && trip.photos.every(photo => typeof photo === 'string')))
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

async function loadCollection<T>(
  db: Firestore,
  userId: string,
  collectionName: 'trips' | 'spots',
  isValid: (value: unknown) => value is T
): Promise<T[]> {
  const snapshot = await getDocs(collection(db, 'users', userId, collectionName))
  return snapshot.docs.map((entry) => {
    const value = { ...entry.data(), id: entry.id }
    if (!isValid(value)) throw new Error(`A saved ${collectionName} entry has an invalid format.`)
    return value
  })
}

export function useFishingData() {
  const { user, initialize } = useFirebaseAuth()
  const data = useState<SavedData>('fishing-data', () => ({ trips: [], spots: [] }))
  const loading = useState('fishing-data-loading', () => false)
  const error = useState<string | null>('fishing-data-error', () => null)
  const db = import.meta.client ? useFirebaseDatabase() : null
  const storage = import.meta.client ? useFirebaseStorage() : null

  // Fetch only the signed-in account's subcollections and discard stale results after an account switch.
  async function loadUserData(account: TidelogUser | null) {
    data.value = { trips: [], spots: [] }
    error.value = null
    if (!account || !db) {
      loading.value = false
      return
    }

    loading.value = true
    try {
      const [trips, spots] = await Promise.all([
        loadCollection(db, account.uid, 'trips', isFishingTrip),
        loadCollection(db, account.uid, 'spots', isFishingSpot)
      ])
      if (user.value?.uid === account.uid) data.value = { trips, spots }
    } catch (caughtError) {
      console.error('Could not load this user’s fishing data from Firestore.', caughtError)
      if (user.value?.uid === account.uid) {
        error.value = 'Could not load your trips and spots. Please try reloading the page.'
      }
    } finally {
      if (user.value?.uid === account.uid) loading.value = false
    }
  }

  if (import.meta.client) {
    void initialize()
    watch(user, account => void loadUserData(account), { immediate: true })
  }

  // Firestore paths are scoped by Firebase UID, so saved data cannot be mixed between accounts.
  async function addTrip(trip: Omit<FishingTrip, 'id'>, photos: File[] = []) {
    const account = user.value
    if (!account || !db || !storage) throw new Error('Sign in before saving a fishing trip.')
    if (photos.length > 6) throw new Error('You can attach up to 6 photos per trip.')
    if (photos.some(photo => !photo.type.startsWith('image/'))) throw new Error('Trip attachments must be image files.')
    if (photos.some(photo => photo.size >= 10 * 1024 * 1024)) throw new Error('Each trip photo must be smaller than 10 MB.')

    const tripReference = doc(collection(db, 'users', account.uid, 'trips'))
    const uploadedReferences: ReturnType<typeof storageRef>[] = []

    try {
      const uploadResults = await Promise.allSettled(photos.map(async (photo, index) => {
        const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const reference = storageRef(storage, `users/${account.uid}/trips/${tripReference.id}/${Date.now()}-${index}-${safeName}`)
        uploadedReferences.push(reference)
        await uploadBytes(reference, photo, { contentType: photo.type })
        return getDownloadURL(reference)
      }))
      const failedUpload = uploadResults.find(result => result.status === 'rejected')
      if (failedUpload?.status === 'rejected') throw failedUpload.reason
      const photoUrls = uploadResults
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)
      const savedTrip = { ...trip, photos: photoUrls }

      await setDoc(tripReference, {
        ...savedTrip,
        createdAt: serverTimestamp()
      })
      if (user.value?.uid === account.uid) data.value.trips.unshift({ ...savedTrip, id: tripReference.id })
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

  async function addSpot(spot: Omit<FishingSpot, 'id'>) {
    const account = user.value
    if (!account || !db) throw new Error('Sign in before saving a fishing spot.')
    const saved = await addDoc(collection(db, 'users', account.uid, 'spots'), {
      ...spot,
      createdAt: serverTimestamp()
    })
    if (user.value?.uid === account.uid) data.value.spots.unshift({ ...spot, id: saved.id })
  }

  return { data, loading, error, addTrip, addSpot }
}
