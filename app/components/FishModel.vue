<script setup lang="ts">
import { ontarioFishModelFiles } from '../data/ontarioFishSpecies'

const props = defineProps<{ species: string }>()
const modelHost = ref<HTMLElement | null>(null)
const loadError = ref(false)
const isLoaded = ref(false)
let visibilityObserver: IntersectionObserver | null = null

// Loads the species' 3D model on demand; takes no input and updates loading/error state from the model result.
async function loadModel() {
  const filename = ontarioFishModelFiles[props.species as keyof typeof ontarioFishModelFiles]
  if (!filename) {
    loadError.value = true
    return
  }
  if (!modelHost.value) return

  try {
    // Register the Web Component only in the browser; GLB rendering depends on WebGL.
    await import('@google/model-viewer')
    const viewer = document.createElement('model-viewer')
    viewer.setAttribute('src', `/assets/models/${filename}`)
    viewer.setAttribute('alt', `3D model of ${props.species}`)
    viewer.setAttribute('camera-controls', '')
    viewer.setAttribute('auto-rotate', '')
    viewer.setAttribute('rotation-per-second', '24deg')
    viewer.setAttribute('interaction-prompt', 'none')
    viewer.setAttribute('shadow-intensity', '0.7')
    viewer.setAttribute('loading', 'lazy')
    viewer.addEventListener('load', () => { isLoaded.value = true }, { once: true })
    viewer.addEventListener('error', () => {
      loadError.value = true
      console.error(`Could not load 3D model for ${props.species}: /assets/models/${filename}`)
    })
    if (modelHost.value?.isConnected) modelHost.value.append(viewer)
  } catch (error) {
    loadError.value = true
    console.error(`Could not initialize the 3D model viewer for ${props.species}.`, error)
  }
}

onMounted(() => {
  const host = modelHost.value
  if (!host) return

  if (!('IntersectionObserver' in window)) {
    void loadModel()
    return
  }

  // Wait until a card is near the viewport before loading the viewer code or its model.
  visibilityObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      visibilityObserver?.disconnect()
      visibilityObserver = null
      void loadModel()
    }
  }, { rootMargin: '120px' })
  visibilityObserver.observe(host)
})

onBeforeUnmount(() => {
  visibilityObserver?.disconnect()
  visibilityObserver = null
})
</script>

<template>
  <div ref="modelHost" class="fish-model" :class="{ 'fish-model-error': loadError }">
    <span v-if="loadError" class="model-fallback" role="img" :aria-label="`3D model unavailable for ${species}`">🐟</span>
    <span v-else-if="!isLoaded" class="model-loading" aria-hidden="true">Loading model…</span>
  </div>
</template>

<style scoped>
.fish-model { align-items: center; background: #f5f7f4; border-radius: 8px; display: flex; flex: 0 0 132px; height: 86px; justify-content: center; overflow: hidden; position: relative; }
.fish-model :deep(model-viewer) { background: transparent; height: 100%; width: 100%; }
.model-loading { color: #94a098; font-size: 12px; }
.model-fallback { font-size: 28px; }
</style>
