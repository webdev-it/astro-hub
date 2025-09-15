import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For TypeScript type safety without @types/node in this config file
declare const process: any

// https://vite.dev/config/
export default defineConfig(() => {
  const base = process.env.BASE_PATH || '/'
  return {
    base,
    plugins: [react()],
  }
})
/*
  The team Astro-Hub in NASA Space Apps Challange
© 2025 Astro-Hub. Все права защищены.
https://astro-hub.space





*/