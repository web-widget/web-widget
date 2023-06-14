import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    jsxImportSource: '@web-widget/react',
    babel: {
      plugins: ['@web-widget/react/babel-plugin']
    }
  })],
})