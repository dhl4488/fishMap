import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'
import { Network } from '@capacitor/network'

// Exposes native platform helpers; takes no input and returns platform state, network API, and feedback action.
export function useNativeFeatures() {
  const isNative = computed(() => Capacitor.isNativePlatform())

  // Plays native success haptics when available; takes no input and resolves after the feedback attempt.
  async function successFeedback() {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (error) {
      console.warn('Native success feedback could not be played.', error)
    }
  }

  return { isNative, Network, successFeedback }
}
