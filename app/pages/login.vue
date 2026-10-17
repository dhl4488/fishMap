<script setup lang="ts">
useHead({ title: 'Sign in · Tidelog', meta: [{ name: 'description', content: 'Sign in to your personal fishing diary.' }] })

const { isConfigured, initialize, user, createAccount, signIn } = useFirebaseAuth()
const route = useRoute()
const router = useRouter()
const isCreatingAccount = ref(false)
const displayName = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

// Resolve a returning user's Firebase session before leaving the sign-in screen visible.
onMounted(async () => {
  await initialize()
  if (user.value) await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
})

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  try {
    if (isCreatingAccount.value) {
      await createAccount(email.value.trim(), password.value, displayName.value.trim())
    } else {
      await signIn(email.value.trim(), password.value)
    }
    await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not authenticate. Please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- Public sign-in and account-creation page. -->
  <main class="auth-page">
    <section class="auth-card">
      <NuxtLink to="/" class="brand auth-brand">
        <img class="brand-mark" src="/assets/tide-log-icon.png" alt="">
        <span class="brand-name">tidelog<span class="brand-period">.</span></span>
      </NuxtLink>
      <p class="eyebrow">YOUR DAYS ON THE WATER</p>
      <h1>{{ isCreatingAccount ? 'Make it your own.' : 'Welcome back.' }}</h1>
      <p class="auth-subtitle">Your fishing notes and favorite spots, all in one place.</p>

      <div v-if="!isConfigured" class="auth-message auth-error">
        Firebase is not configured yet. Add the Firebase settings to your <code>.env</code> file and restart the app.
      </div>
      <form @submit.prevent="submit">
        <div v-if="isCreatingAccount" class="form-field auth-field">
          <label for="display-name">Your name</label>
          <input id="display-name" v-model="displayName" autocomplete="name" required maxlength="80" placeholder="How should we address you?">
        </div>
        <div class="form-field auth-field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required placeholder="you@example.com">
        </div>
        <div class="form-field auth-field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" :autocomplete="isCreatingAccount ? 'new-password' : 'current-password'" minlength="6" required placeholder="At least 6 characters">
        </div>
        <p v-if="errorMessage" class="auth-message auth-error" role="alert">{{ errorMessage }}</p>
        <button class="primary-button auth-submit" type="submit" :disabled="!isConfigured || submitting">
          {{ submitting ? 'One moment…' : isCreatingAccount ? 'Create account' : 'Sign in' }}
        </button>
      </form>
      <p class="auth-switch">
        {{ isCreatingAccount ? 'Already have an account?' : 'New to Tidelog?' }}
        <button type="button" @click="isCreatingAccount = !isCreatingAccount; errorMessage = ''">
          {{ isCreatingAccount ? 'Sign in' : 'Create an account' }}
        </button>
      </p>
    </section>
  </main>
</template>

<style scoped>
.auth-page { align-items: center; background: #f7f8f5; display: flex; justify-content: center; min-height: 100vh; padding: 24px; }
.auth-card { background: white; border: 1px solid #ecefea; border-radius: 15px; max-width: 420px; padding: 35px; width: 100%; }
.auth-brand { margin: 0 0 34px; }
.auth-card h1 { font: 700 27px/1.2 Manrope,sans-serif; letter-spacing: -.8px; margin: 0 0 8px; }
.auth-subtitle { color: #82908a; font-size: 12px; line-height: 1.6; margin: 0 0 24px; }
.auth-field { margin-bottom: 14px; }
.auth-submit { margin-top: 5px; width: 100%; }
.auth-submit:disabled { cursor: not-allowed; opacity: .55; }
.auth-message { border-radius: 8px; font-size: 11px; line-height: 1.55; margin: 0 0 15px; padding: 10px 12px; }
.auth-error { background: #fbf0ec; color: #985b45; }
.auth-error code { font-size: 10px; }
.auth-switch { color: #839088; font-size: 11px; margin: 20px 0 0; text-align: center; }
.auth-switch button { background: none; border: 0; color: #316b53; font-size: inherit; font-weight: 700; padding: 0 0 0 3px; }
</style>
