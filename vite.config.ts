import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/NexusSurvival-2.0/', // This line fixes 404 errors on GitHub Pages
})
