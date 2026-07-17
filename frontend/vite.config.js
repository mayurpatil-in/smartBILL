import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'logo2.png'],
      manifest: {
        name: 'SmartBill',
        short_name: 'SmartBill',
        description: 'SmartBill Billing System',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'logo2.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo2.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
