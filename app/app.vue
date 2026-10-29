<script setup lang="ts">
const route = useRoute()

useHead({ link: [{ rel: 'manifest', href: '/manifest.webmanifest' }] })
</script>

<template>
  <NuxtPage v-if="route.path === '/login' || route.path === '/landing'" />
  <div v-else class="app-shell">
    <AppSidebar />
    <main class="main-content">
      <NuxtPage />
    </main>
  </div>
</template>
