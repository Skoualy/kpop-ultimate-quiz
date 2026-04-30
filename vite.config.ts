import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // @import est déprécié dans Sass mais reste la seule approche
        // fiable avec additionalData sur tous les environnements.
        // @use avec namespace échoue car Dart Sass ne résout pas le chemin
        // correctement quand il est injecté comme préfixe de fichier.
        // Les mixins sont donc accessibles sans namespace : @include sm { }
        additionalData: `@import "${path.resolve(__dirname, 'src/styles/breakpoints').replace(/\\/g, '/')}";`,
      },
    },
  },
})
