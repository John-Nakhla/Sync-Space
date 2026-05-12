import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // This fixes the "global is not defined" error in your screenshot
    global: 'window',
  },
})