import type { FishingTrip } from './useFishingData'

export interface OfflineTripRecord {
  key: string
  userId: string
  tripId: string
  trip: Omit<FishingTrip, 'id'>
  photos: File[]
  catchPhotoFiles: Array<File | null>
  queuedAt: number
}

const databaseName = 'tidelog-offline'
const storeName = 'pendingTrips'

function openQueueDatabase(): Promise<IDBDatabase> {
  if (!import.meta.client || !('indexedDB' in window)) {
    return Promise.reject(new Error('Offline saving is not supported by this browser.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local offline storage.'))
    request.onblocked = () => reject(new Error('Local offline storage is busy in another tab. Close other Tidelog tabs and try again.'))
  })
}

async function runQueueTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openQueueDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = run(transaction.objectStore(storeName))
    let result: T
    request.onsuccess = () => { result = request.result }
    request.onerror = () => reject(request.error ?? new Error('Could not access local offline storage.'))
    transaction.oncomplete = () => {
      database.close()
      resolve(result)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('Could not save the offline trip.'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? new Error('The offline trip could not be saved.'))
    }
  })
}

export async function listOfflineTrips(userId: string): Promise<OfflineTripRecord[]> {
  const records = await runQueueTransaction<OfflineTripRecord[]>('readonly', store => store.getAll())
  return records.filter(record => record.userId === userId)
}

export async function saveOfflineTrip(record: OfflineTripRecord): Promise<void> {
  await runQueueTransaction<IDBValidKey>('readwrite', store => store.put(record))
}

export async function removeOfflineTrip(userId: string, tripId: string): Promise<void> {
  await runQueueTransaction<undefined>('readwrite', store => store.delete(`${userId}:${tripId}`))
}
