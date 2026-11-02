<script setup lang="ts">
useHead({ title: 'Account · Tidelog', meta: [{ name: 'description', content: 'Manage your Tidelog account.' }] })

const { deleteAccount: permanentlyDeleteAccount } = useFirebaseAuth()
const confirmation = ref('')
const errorMessage = ref('')
const deleting = ref(false)

async function deleteUserAccount() {
  if (confirmation.value !== 'DELETE' || deleting.value) return
  deleting.value = true
  errorMessage.value = ''
  try {
    await permanentlyDeleteAccount()
    await navigateTo('/landing')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not delete your account. Please try again.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="page-wrap">
    <header class="topbar">
      <div class="breadcrumb">Your space <span aria-hidden="true">/</span> <strong>Account</strong></div>
    </header>

    <section class="page-heading">
      <div>
        <p class="eyebrow">YOUR ACCOUNT</p>
        <h1>Account settings</h1>
        <p class="subtitle">Manage your account and personal data.</p>
      </div>
    </section>

    <section class="photo-storage-panel panel" aria-label="Photo storage">
      <div>
        <strong>Photo storage</strong>
        <span>Storage usage details aren't available yet.</span>
      </div>
      <button class="secondary-button" type="button" disabled>
        Coming soon
      </button>
    </section>

    <section class="account-danger-panel panel" aria-labelledby="delete-account-heading">
      <p class="eyebrow">PERMANENT ACTION</p>
      <h2 id="delete-account-heading">Delete your account</h2>
      <p>This permanently deletes your account, fishing logs, saved spots, tacklebox, photos, and account data. This can’t be undone.</p>
      <p>Pending trips saved on this device will also be removed. For your security, you may need to sign in again before deleting.</p>

      <form class="account-delete-form" @submit.prevent="deleteUserAccount">
        <label for="delete-account-confirmation">Type DELETE to confirm</label>
        <input
          id="delete-account-confirmation"
          v-model="confirmation"
          autocomplete="off"
          :disabled="deleting"
          spellcheck="false"
        >
        <div v-if="errorMessage" class="auth-message auth-error" role="alert">{{ errorMessage }}</div>
        <button class="danger-button" type="submit" :disabled="confirmation !== 'DELETE' || deleting">
          {{ deleting ? 'Deleting account…' : 'Permanently delete account' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.photo-storage-panel { align-items: center; display: flex; gap: 14px; justify-content: space-between; margin-top: 20px; max-width: 700px; padding: 13px 15px; }
.photo-storage-panel > div { display: grid; gap: 4px; min-width: 0; }
.photo-storage-panel strong { color: #425148; font-size: 13px; }
.photo-storage-panel span { color: #89958e; font-size: 12px; line-height: 1.4; }
.photo-storage-panel .secondary-button { flex: 0 0 auto; min-height: 36px; }
.account-danger-panel { border-color: #ead9d2; margin-top: 20px; max-width: 700px; padding: 24px; }
.account-danger-panel h2 { color: #713e32; font-size: 20px; margin: 0 0 10px; }
.account-danger-panel > p:not(.eyebrow) { color: #69776e; font-size: 14px; line-height: 1.6; margin: 8px 0; }
.account-delete-form { display: grid; gap: 9px; margin-top: 20px; max-width: 420px; }
.account-delete-form label { color: #536158; font-size: 13px; font-weight: 650; }
.account-delete-form input { background: #fff; border: 1px solid #dfe6de; border-radius: 8px; color: #293b30; min-height: 42px; padding: 8px 11px; }
.danger-button { background: #9c4c3b; border: 1px solid #9c4c3b; border-radius: 8px; color: #fff; cursor: pointer; font-size: 13px; font-weight: 700; justify-self: start; margin-top: 4px; min-height: 42px; padding: 0 15px; }
.danger-button:hover:not(:disabled) { background: #813b2d; }
.danger-button:disabled { cursor: not-allowed; opacity: .55; }
@media (max-width: 600px) {
  .photo-storage-panel { align-items: flex-start; flex-direction: column; }
  .account-danger-panel { padding: 18px; }
  .danger-button { justify-self: stretch; }
}
</style>
