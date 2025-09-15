import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For TypeScript type safety without @types/node in this config file
declare const process: any

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    base: isProduction ? '/astro-hub/projects/2025/met/' : '/',
    plugins: [react()],
    build: {
      outDir: isProduction ? '../../../../docs/projects/2025/met' : 'dist',
      emptyOutDir: false
    }
  }
})
/*
  The team Astro-Hub in NASA Space Apps Challange
© 2025 Astro-Hub. Все права защищены.
https://astro-hub.space





*/