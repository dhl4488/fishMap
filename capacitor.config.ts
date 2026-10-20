import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tidelog.app',
  appName: 'Tidelog',
  webDir: '.output/public',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#f7f8f5'
  },
  android: {
    backgroundColor: '#f7f8f5'
  }
}

export default config
