/**
 * Android Auth Fix — src/lib/androidAuth.js
 *
 * On Android, Google OAuth redirects back via a custom URL scheme
 * (com.lume.mentalwellness://...) instead of http://localhost.
 *
 * This module:
 *  1. Detects if running on Android (Capacitor)
 *  2. Opens OAuth in the system browser (not in-app WebView)
 *  3. Handles the redirect back into the app
 *
 * Usage: import and call initAndroidAuth() in main.jsx
 */

import { supabase } from './supabase'

/**
 * Detect if running inside a Capacitor app (Android/iOS).
 */
export function isCapacitor() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
}

/**
 * Initialize deep-link auth handler for Android.
 * Call once at app startup.
 */
export async function initAndroidAuth() {
  if (!isCapacitor()) return

  try {
    const { App } = await import('@capacitor/app')

    // Listen for deep links — fired when the app is opened via
    // com.lume.mentalwellness://... after OAuth completes
    App.addListener('appUrlOpen', async ({ url }) => {
      if (!url) return

      // Extract the hash/query from the redirect URL
      // Supabase sends: com.lume.mentalwellness://#access_token=...
      const hashOrQuery = url.includes('#') ? url.split('#')[1] : url.split('?')[1]
      if (!hashOrQuery) return

      // Let Supabase process the OAuth callback
      const params = new URLSearchParams(hashOrQuery)
      const accessToken  = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
      }
    })
  } catch (err) {
    console.warn('[AndroidAuth] Could not set up deep link listener:', err)
  }
}

/**
 * Sign in with Google using the system browser on Android.
 * Falls back to normal OAuth on web.
 *
 * Replace the standard supabase.auth.signInWithOAuth call with this.
 */
export async function signInWithGoogleAndroid() {
  if (!isCapacitor()) {
    // Web: standard redirect
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  // Android: open in system browser with custom scheme redirect
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'com.lume.mentalwellness://',
      skipBrowserRedirect: false,
    },
  })
}
