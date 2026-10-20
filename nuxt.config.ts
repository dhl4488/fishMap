// https://nuxt.com/docs/api/configuration/nuxt-config
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: !isCapacitorBuild,
  app: {
    baseURL: isCapacitorBuild ? './' : '/'
  },
  nitro: isCapacitorBuild ? { preset: 'static' } : {},
  runtimeConfig: {
    public: {
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseAppId: '',
      firebaseStorageBucket: '',
      firebaseMessagingSenderId: '',
      firebaseMeasurementId: ''
    }
  }
})
