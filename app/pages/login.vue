<script setup lang="ts">
import { FirebaseError } from 'firebase/app'

useHead({ title: 'Sign in · Reeliary', meta: [{ name: 'description', content: 'Sign in to your personal fishing diary.' }] })

const { isConfigured, initialize, user, createAccount, signIn, sendPasswordReset } = useFirebaseAuth()
const passwordResetConfirmation = 'If an account exists for this email, you’ll receive a password reset link shortly.'
const route = useRoute()
const router = useRouter()
const isCreatingAccount = ref(route.query.mode === 'create')
const isResettingPassword = ref(false)
const displayName = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)

// Resolve a returning user's Firebase session before leaving the sign-in screen visible.
onMounted(async () => {
  await initialize()
  if (user.value) await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
})

// Authenticates or creates the account from form fields; takes no input and navigates on success or sets an error.
async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true
  try {
    if (isResettingPassword.value) {
      await sendPasswordReset(email.value.trim())
      successMessage.value = passwordResetConfirmation
    } else if (isCreatingAccount.value) {
      await createAccount(email.value.trim(), password.value, displayName.value.trim())
    } else {
      await signIn(email.value.trim(), password.value)
    }
    if (!isResettingPassword.value) {
      await router.replace(typeof route.query.redirect === 'string' ? route.query.redirect : '/')
    }
  } catch (error) {
    if (isResettingPassword.value && error instanceof FirebaseError && error.code === 'auth/user-not-found') {
      successMessage.value = passwordResetConfirmation
    } else {
      errorMessage.value = error instanceof Error ? error.message : 'Could not authenticate. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <!-- Public sign-in and account-creation page. -->
  <main class="auth-page">
    <section class="auth-card">
      <NuxtLink to="/landing" class="brand auth-brand">
        <img class="brand-mark" :src="asset('/assets/tide-log-icon.png')" alt="">
        <span class="brand-name">reeliary<span class="brand-period">.</span></span>
      </NuxtLink>
      <p class="eyebrow">YOUR DAYS ON THE WATER</p>
      <h1>{{ isResettingPassword ? 'Reset your password.' : isCreatingAccount ? 'Make it your own.' : 'Welcome back.' }}</h1>
      <p class="auth-subtitle">
        {{ isResettingPassword ? 'Enter the email address for your account and we’ll send you a reset link.' : 'Your fishing notes and favorite spots, all in one place.' }}
      </p>

      <div v-if="!isConfigured" class="auth-message auth-error">
        Firebase is not configured yet. Add the Firebase settings to your <code>.env</code> file and restart the app.
      </div>
      <form @submit.prevent="submit">
        <div v-if="isCreatingAccount && !isResettingPassword" class="form-field auth-field">
          <label for="display-name">Your name</label>
          <input id="display-name" v-model="displayName" autocomplete="name" required maxlength="80" placeholder="How should we address you?">
        </div>
        <div class="form-field auth-field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required placeholder="you@example.com">
        </div>
        <div v-if="!isResettingPassword" class="form-field auth-field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" :autocomplete="isCreatingAccount ? 'new-password' : 'current-password'" minlength="6" required placeholder="At least 6 characters">
        </div>
        <p v-if="errorMessage" class="auth-message auth-error" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="auth-message auth-success" role="status">{{ successMessage }}</p>
        <button v-if="!isCreatingAccount && !isResettingPassword" class="auth-forgot" type="button" @click="isResettingPassword = true; errorMessage = ''; successMessage = ''">
          Forgot password?
        </button>
        <button class="primary-button auth-submit" type="submit" :disabled="!isConfigured || submitting">
          {{ submitting ? 'One moment…' : isResettingPassword ? 'Send reset link' : isCreatingAccount ? 'Create account' : 'Sign in' }}
        </button>
      </form>
      <p v-if="isResettingPassword" class="auth-switch">
        Remembered your password?
        <button type="button" @click="isResettingPassword = false; errorMessage = ''; successMessage = ''">Back to sign in</button>
      </p>
      <p v-else class="auth-switch">
        {{ isCreatingAccount ? 'Already have an account?' : 'New to Reeliary?' }}
        <button type="button" @click="isCreatingAccount = !isCreatingAccount; errorMessage = ''; successMessage = ''">
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
.auth-message { border-radius: 8px; font-size: 12px; line-height: 1.55; margin: 0 0 15px; padding: 10px 12px; }
.auth-error { background: #fbf0ec; color: #985b45; }
.auth-success { background: #edf5ef; color: #316b53; }
.auth-error code { font-size: 12px; }
.auth-forgot { background: none; border: 0; color: #316b53; cursor: pointer; display: block; font-size: 12px; font-weight: 700; margin: -4px 0 13px auto; padding: 0; }
.auth-switch { color: #839088; font-size: 12px; margin: 20px 0 0; text-align: center; }
.auth-switch button { background: none; border: 0; color: #316b53; font-size: inherit; font-weight: 700; padding: 0 0 0 3px; }
</style>
