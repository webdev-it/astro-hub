import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  
  return {
    base: isProduction ? '/astro-hub/projects/2025/met/met-app/' : '/',
    plugins: [react()],
    build: {
      outDir: isProduction ? '../../../../docs/projects/2025/met/met-app' : 'dist',
      emptyOutDir: false,
    },
  }
})
/*
  The team Astro-Hub in NASA Space Apps Challange
© 2025 Astro-Hub. Все права защищены.
https://astro-hub.space





*/