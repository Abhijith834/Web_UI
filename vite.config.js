import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Web_UI/',
  plugins: [
    tailwindcss(),
    react()],
    server: {
      historyApiFallback: true, // Allow routing fallback
      
    }
})
