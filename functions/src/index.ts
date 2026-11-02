import { randomUUID } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { getAuth } from 'firebase-admin/auth'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const monthlyPhotoLimit = 100
const maxPhotoBytes = 6 * 1024 * 1024
const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

initializeApp()

export const uploadTripPhoto = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    const userId = request.auth?.uid
    if (!userId) throw new HttpsError('unauthenticated', 'Sign in before uploading a photo.')
    try {
      await getAuth().getUser(userId)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/user-not-found') {
        throw new HttpsError('unauthenticated', 'This account is no longer available.')
      }
      console.error('Could not verify the photo uploader account.', error)
      throw new HttpsError('internal', 'Could not verify your account. Please try again.')
    }

    if (typeof request.data !== 'object' || request.data === null) {
      throw new HttpsError('invalid-argument', 'The photo upload data is invalid.')
    }
    const { tripId, contentType, dataBase64 } = request.data as {
      tripId?: unknown
      contentType?: unknown
      dataBase64?: unknown
    }
    if (typeof tripId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(tripId)) {
      throw new HttpsError('invalid-argument', 'The trip ID is invalid.')
    }
    if (typeof contentType !== 'string' || !allowedContentTypes.has(contentType)) {
      throw new HttpsError('invalid-argument', 'Photos must be JPEG, PNG, WebP, or GIF images.')
    }
    if (
      typeof dataBase64 !== 'string' ||
      dataBase64.length > Math.ceil(maxPhotoBytes / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(dataBase64)
    ) {
      throw new HttpsError('invalid-argument', 'The resized photo is too large to send. Please try another image.')
    }

    const bytes = Buffer.from(dataBase64, 'base64')
    if (!bytes.length || bytes.length > maxPhotoBytes) {
      throw new HttpsError('invalid-argument', 'The resized photo is too large to send. Please try another image.')
    }

    const month = new Date().toISOString().slice(0, 7)
    const firestore = getFirestore()
    const lifecycleRef = firestore.doc(`accountDeletions/${userId}`)
    const quotaRef = firestore.doc(`photoUploadQuotas/${userId}_${month}`)
    await getFirestore().runTransaction(async (transaction) => {
      const lifecycle = await transaction.get(lifecycleRef)
      if (lifecycle.data()?.deleting === true) {
        throw new HttpsError('permission-denied', 'This account is being deleted and cannot upload photos.')
      }
      const quota = await transaction.get(quotaRef)
      const count = quota.data()?.count ?? 0
      if (!Number.isInteger(count) || count < 0) {
        throw new HttpsError('internal', 'The photo upload limit could not be checked.')
      }
      if (count >= monthlyPhotoLimit) {
        throw new HttpsError('resource-exhausted', `You have reached the limit of ${monthlyPhotoLimit} photo uploads this month.`)
      }
      transaction.set(quotaRef, {
        userId,
        month,
        count: count + 1,
        updatedAt: FieldValue.serverTimestamp()
      })
      transaction.set(lifecycleRef, {
        ...lifecycle.data(),
        deleting: false,
        activeUploads: (lifecycle.data()?.activeUploads ?? 0) + 1
      })
    })

    const extension = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1]
    const objectPath = `users/${userId}/trips/${tripId}/${randomUUID()}.${extension}`
    const downloadToken = randomUUID()
    let uploadError: unknown
    try {
      await getStorage().bucket().file(objectPath).save(bytes, {
        resumable: false,
        metadata: {
          contentType,
          metadata: { firebaseStorageDownloadTokens: downloadToken }
        }
      })
    } catch (error) {
      uploadError = error
      console.error('Firebase Storage photo upload failed.', error)
    }

    try {
      await firestore.runTransaction(async (transaction) => {
        const [lifecycle, quota] = await Promise.all([
          transaction.get(lifecycleRef),
          uploadError ? transaction.get(quotaRef) : Promise.resolve(null)
        ])
        const activeUploads = lifecycle.data()?.activeUploads
        if (typeof activeUploads !== 'number' || activeUploads < 1) {
          throw new HttpsError('internal', 'The photo upload could not be finalized.')
        }
        transaction.update(lifecycleRef, { activeUploads: activeUploads - 1 })
        if (quota) {
          const count = quota.data()?.count
          if (typeof count !== 'number' || count < 1) {
            throw new HttpsError('internal', 'The photo upload allowance could not be restored.')
          }
          if (count === 1) transaction.delete(quotaRef)
          else transaction.update(quotaRef, { count: count - 1, updatedAt: FieldValue.serverTimestamp() })
        }
      })
    } catch (finalizeError) {
      console.error('Could not finalize the photo upload accounting.', finalizeError)
      throw new HttpsError('internal', 'The photo upload could not be finalized. Please contact support if it appears in your trip.')
    }
    if (uploadError) throw new HttpsError('internal', 'The photo could not be uploaded. Please try again.')

    const bucket = getStorage().bucket().name
    return {
      photoUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${downloadToken}`
    }
  }
)

export const deleteUserAccount = onCall(
  { region: 'us-central1', timeoutSeconds: 300 },
  async (request) => {
    const userId = request.auth?.uid
    if (!userId) throw new HttpsError('unauthenticated', 'Sign in before deleting your account.')

    const authTime = Number(request.auth?.token.auth_time)
    if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 5 * 60) {
      throw new HttpsError(
        'failed-precondition',
        'For your security, sign out and sign back in before deleting your account.'
      )
    }

    const firestore = getFirestore()
    const lifecycleRef = firestore.doc(`accountDeletions/${userId}`)
    await firestore.runTransaction(async (transaction) => {
      const lifecycle = await transaction.get(lifecycleRef)
      transaction.set(lifecycleRef, {
        ...lifecycle.data(),
        deleting: true,
        activeUploads: lifecycle.data()?.activeUploads ?? 0,
        startedAt: FieldValue.serverTimestamp()
      })
    })

    const deadline = Date.now() + 150_000
    while (true) {
      const lifecycle = await lifecycleRef.get()
      if ((lifecycle.data()?.activeUploads ?? 0) === 0) break
      if (Date.now() >= deadline) {
        throw new HttpsError('deadline-exceeded', 'A photo upload is still finishing. Please try deleting your account again shortly.')
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    try {
      await getStorage().bucket().deleteFiles({ prefix: `users/${userId}/` })
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 404) {
        console.error('Could not remove the account photos from Cloud Storage.', error)
        throw new HttpsError('internal', 'Could not remove account photos. Please try again.')
      }
    }
    await firestore.recursiveDelete(firestore.doc(`users/${userId}`))

    const quotas = await firestore.collection('photoUploadQuotas').where('userId', '==', userId).get()
    for (let offset = 0; offset < quotas.docs.length; offset += 500) {
      const batch = firestore.batch()
      quotas.docs.slice(offset, offset + 500).forEach((quota) => batch.delete(quota.ref))
      await batch.commit()
    }

    await getAuth().deleteUser(userId)
    await lifecycleRef.delete()
    return { deleted: true }
  }
)
