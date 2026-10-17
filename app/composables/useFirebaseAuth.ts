import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from 'firebase/auth'
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

export interface TidelogUser {
  uid: string
  email: string | null
  displayName: string | null
}

interface FirebaseClient {
  app: FirebaseApp
  auth: ReturnType<typeof getAuth>
  db: Firestore
}

interface FirebaseOptions {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  storageBucket?: string
  messagingSenderId?: string
  measurementId?: string
}

let firebaseClient: FirebaseClient | null = null

function getFirebaseClient(options: FirebaseOptions): FirebaseClient | null {
  if (!import.meta.client) return null
  if (firebaseClient) return firebaseClient

  if (!options.apiKey || !options.authDomain || !options.projectId || !options.appId) return null

  const app = getApps().find(candidate => candidate.name === 'tidelog')
    ?? initializeApp(options, 'tidelog')
  firebaseClient = { app, auth: getAuth(app), db: getFirestore(app) }
  return firebaseClient
}

function toTidelogUser(user: User | null): TidelogUser | null {
  if (!user) return null
  return { uid: user.uid, email: user.email, displayName: user.displayName }
}

export function useFirebaseAuth() {
  const runtimeConfig = useRuntimeConfig().public
  const firebaseOptions = {
    apiKey: runtimeConfig.firebaseApiKey,
    authDomain: runtimeConfig.firebaseAuthDomain,
    projectId: runtimeConfig.firebaseProjectId,
    appId: runtimeConfig.firebaseAppId,
    storageBucket: runtimeConfig.firebaseStorageBucket,
    messagingSenderId: runtimeConfig.firebaseMessagingSenderId,
    measurementId: runtimeConfig.firebaseMeasurementId
  }
  const user = useState<TidelogUser | null>('firebase-user', () => null)
  const ready = useState('firebase-auth-ready', () => false)
  const listenerStarted = useState('firebase-auth-listener-started', () => false)

  const isConfigured = computed(() => getFirebaseClient(firebaseOptions) !== null)

  async function initialize(): Promise<void> {
    if (!import.meta.client || ready.value) return
    const client = getFirebaseClient(firebaseOptions)
    if (!client) {
      ready.value = true
      return
    }
    if (listenerStarted.value) {
      await new Promise<void>((resolve) => {
        const stop = watch(ready, (initialized) => {
          if (initialized) {
            stop()
            resolve()
          }
        }, { immediate: true })
      })
      return
    }

    listenerStarted.value = true
    await new Promise<void>((resolve) => {
      onAuthStateChanged(client.auth, (firebaseUser) => {
        user.value = toTidelogUser(firebaseUser)
        ready.value = true
        resolve()
      }, (error) => {
        console.error('Firebase authentication state could not be loaded.', error)
        ready.value = true
        resolve()
      })
    })
  }

  async function createAccount(email: string, password: string, displayName: string): Promise<void> {
    const client = getFirebaseClient(firebaseOptions)
    if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
    const credential = await createUserWithEmailAndPassword(client.auth, email, password)
    await updateProfile(credential.user, { displayName })
    user.value = toTidelogUser(credential.user)
  }

  async function signIn(email: string, password: string): Promise<void> {
    const client = getFirebaseClient(firebaseOptions)
    if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
    const credential = await signInWithEmailAndPassword(client.auth, email, password)
    user.value = toTidelogUser(credential.user)
  }

  async function signOutUser(): Promise<void> {
    const client = getFirebaseClient(firebaseOptions)
    if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
    await signOut(client.auth)
    user.value = null
  }

  return { user, ready, isConfigured, initialize, createAccount, signIn, signOutUser }
}

export function useFirebaseDatabase() {
  const runtimeConfig = useRuntimeConfig().public
  const client = getFirebaseClient({
    apiKey: runtimeConfig.firebaseApiKey,
    authDomain: runtimeConfig.firebaseAuthDomain,
    projectId: runtimeConfig.firebaseProjectId,
    appId: runtimeConfig.firebaseAppId,
    storageBucket: runtimeConfig.firebaseStorageBucket,
    messagingSenderId: runtimeConfig.firebaseMessagingSenderId,
    measurementId: runtimeConfig.firebaseMeasurementId
  })
  if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
  return client.db
}
