import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@web-widget/react',
      babel: {
        plugins: ['@web-widget/react/babel-plugin']
      }
    }),
    vue()
  ],
})