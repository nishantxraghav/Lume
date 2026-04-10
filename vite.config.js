import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Required for Capacitor: build output must go to 'dist'
  // and base must be './' for file:// protocol in WebView
  base: './',
  build: {
    outDir: 'dist',
    // Inline small assets so they work without a server
    assetsInlineLimit: 4096,
  },
  server: {
    // Allow LAN access for testing on real Android device
    host: '0.0.0.0',
    port: 5173,
  },
})
