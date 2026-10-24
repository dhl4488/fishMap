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
import { getStorage, type FirebaseStorage } from 'firebase/storage'

export interface TidelogUser {
  uid: string
  email: string | null
  displayName: string | null
}

interface FirebaseClient {
  app: FirebaseApp
  auth: ReturnType<typeof getAuth>
  db: Firestore
  storage: FirebaseStorage
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

// Reuse one Firebase app instance in the browser rather than initializing per component.
let firebaseClient: FirebaseClient | null = null

// Initializes or reuses the browser Firebase client; accepts configuration and returns services or null if unavailable.
function getFirebaseClient(options: FirebaseOptions): FirebaseClient | null {
  if (!import.meta.client) return null
  if (firebaseClient) return firebaseClient

  if (!options.apiKey || !options.authDomain || !options.projectId || !options.appId) return null

  const app = getApps().find(candidate => candidate.name === 'tidelog')
    ?? initializeApp(options, 'tidelog')
  firebaseClient = { app, auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) }
  return firebaseClient
}

// Converts a Firebase user to the app's public user shape; accepts a Firebase user and returns its mapped form or null.
function toTidelogUser(user: User | null): TidelogUser | null {
  if (!user) return null
  return { uid: user.uid, email: user.email, displayName: user.displayName }
}

// Provides shared auth state and operations; takes no input and returns configuration, session, and auth methods.
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

  // Resolves Firebase's initial session lookup; takes no input and marks auth ready after state is loaded.
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

  // Creates a Firebase account and sets its display name; accepts credentials/name and updates shared user state.
  async function createAccount(email: string, password: string, displayName: string): Promise<void> {
    const client = getFirebaseClient(firebaseOptions)
    if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
    const credential = await createUserWithEmailAndPassword(client.auth, email, password)
    await updateProfile(credential.user, { displayName })
    user.value = toTidelogUser(credential.user)
  }

  // Signs in with email/password; accepts credentials and updates shared user state after authentication.
  async function signIn(email: string, password: string): Promise<void> {
    const client = getFirebaseClient(firebaseOptions)
    if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
    const credential = await signInWithEmailAndPassword(client.auth, email, password)
    user.value = toTidelogUser(credential.user)
  }

  // Signs out the active Firebase user; takes no input and clears shared user state after success.
  async function signOutUser(): Promise<void> {
    const client = getFirebaseClient(firebaseOptions)
    if (!client) throw new Error('Firebase is not configured. Add the Firebase environment variables and restart the app.')
    await signOut(client.auth)
    user.value = null
  }

  return { user, ready, isConfigured, initialize, createAccount, signIn, signOutUser }
}

// Returns the configured Firestore client; takes no input and throws when Firebase is unavailable.
export function useFirebaseDatabase() {
  return getFirebaseServices().db
}

// Returns the configured Firebase Storage client; takes no input and throws when Firebase is unavailable.
export function useFirebaseStorage() {
  return getFirebaseServices().storage
}

// Resolves all configured Firebase services; takes no input and returns clients or throws a configuration error.
function getFirebaseServices() {
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
  return client
}
