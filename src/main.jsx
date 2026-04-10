import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// ── Capacitor: initialize native plugins ──────────────────────────
// These imports are safe to include in web too — they no-op on desktop
async function initCapacitor() {
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const { Keyboard } = await import('@capacitor/keyboard')

    // Hide splash screen after React mounts
    await SplashScreen.hide({ fadeOutDuration: 400 })

    // Set status bar to light style (dark icons on light background)
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#f4f1ec' })

    // Keyboard: resize body so input area stays visible above keyboard
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--kb-height', `${info.keyboardHeight}px`)
    })
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--kb-height', '0px')
    })
  } catch {
    // Not running in Capacitor (web dev mode) — skip silently
  }
}

// Handle Android back button
async function initBackButton() {
  try {
    const { App: CapApp } = await import('@capacitor/app')
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        CapApp.exitApp()
      }
    })
  } catch { /* web dev — skip */ }
}

initCapacitor()
initBackButton()

// Initialize Android OAuth deep-link handler
import('./lib/androidAuth').then(m => m.initAndroidAuth()).catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
