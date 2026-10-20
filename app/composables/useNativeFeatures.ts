import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'
import { Network } from '@capacitor/network'

export function useNativeFeatures() {
  const isNative = computed(() => Capacitor.isNativePlatform())

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
