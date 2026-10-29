<script setup lang="ts">
const route = useRoute()
const { name } = useUserProfile()
const { signOutUser } = useFirebaseAuth()

// Signs out the current user and navigates to sign-in; takes no input and returns after navigation completes.
async function logout() {
  await signOutUser()
  await navigateTo('/landing')
}

const navigation = [
  { label: 'Overview', to: '/', icon: '◫' },
  { label: 'My diary', to: '/logs', icon: '▤' },
  { label: 'Tacklebox', to: '/tacklebox', icon: '▣' },
  { label: 'Fishing spots', to: '/maps', icon: '⌖' },
  { label: 'About', to: '/about', icon: 'ℹ' },
]
</script>

<template>
  <aside class="sidebar">
    <NuxtLink to="/" class="brand" aria-label="Tidelog home">
      <img class="brand-mark" src="/assets/tide-log-icon.png" alt="">
      <span class="brand-name">tidelog<span class="brand-period">.</span></span>
    </NuxtLink>

    <div class="sidebar-caption">YOUR SPACE</div>
    <nav class="main-nav" aria-label="Main navigation">
      <NuxtLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="nav-link"
        :class="{ 'nav-link-active': route.path === item.to }"
      >
        <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="sidebar-bottom">
      <div class="season-card">
        <div class="season-icon">✳</div>
        <p class="season-title">A little reminder</p>
        <p class="season-copy">The best stories start before the first bite.</p>
      </div>
      <div class="profile">
        <div class="avatar">{{ name.charAt(0).toUpperCase() }}</div>
        <div class="profile-text"><strong>{{ name }}</strong><span>Weekend angler</span></div>
        <button class="profile-menu" aria-label="Sign out" title="Sign out" @click="logout">↗</button>
      </div>
    </div>
  </aside>
</template>
