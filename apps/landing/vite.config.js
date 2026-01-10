import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const toolkitSrc = path.resolve(__dirname, '../../../real-life-stack/packages/toolkit/src')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  resolve: {
    conditions: ['development', 'import'],
    alias: {
      '@/': `${toolkitSrc}/`,
    },
  },
})
