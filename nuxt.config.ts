// https://nuxt.com/docs/api/configuration/nuxt-config
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'
// GitHub Pages build (set by .github/workflows/deploy-pages.yml): static single-page app served from /<repo>/
const isPagesBuild = process.env.PAGES_BUILD === 'true'
const isStaticBuild = isCapacitorBuild || isPagesBuild

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  ssr: !isStaticBuild,
  app: {
    baseURL: isCapacitorBuild ? './' : (process.env.NUXT_APP_BASE_URL || '/')
  },
  nitro: isStaticBuild ? { preset: 'static' } : {},
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
