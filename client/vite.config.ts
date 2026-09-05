import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'

const __dirname = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      zod: resolve(__dirname, 'node_modules/zod')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
})
