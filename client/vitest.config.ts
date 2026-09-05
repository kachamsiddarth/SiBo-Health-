import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const __dirname = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      zod: resolve(__dirname, 'node_modules/zod')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
