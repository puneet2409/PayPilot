/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(process.env.VITEST ? [] : [tailwindcss()])
  ],
  test: {
    globals: true,
    environment: 'node'
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('ag-grid')) {
            return 'vendor-ag-grid'
          }
          if (id.includes('@paypal/react-paypal-js')) {
            return 'vendor-paypal'
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('react-markdown')) {
            return 'vendor-react'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
        }
      }
    }
  }
})
