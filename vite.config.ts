// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
            return 'charts'
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix'
          }
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
            return 'motion'
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router') || id.includes('node_modules/scheduler')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
