import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Must be unique — use reverse domain format
  appId: 'com.lume.mentalwellness',
  appName: 'Lume',
  webDir: 'dist',

  // Android-specific configuration
  android: {
    // Allow mixed content (http + https) — needed for some APIs
    allowMixedContent: true,
    // Use legacy WebView on older Android if needed
    useLegacyBridge: false,
    // Capture console.log output in Android Studio logcat
    captureInput: true,
  },

  // Plugin configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f4f1ec',   // matches --bg CSS variable
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f4f1ec',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
