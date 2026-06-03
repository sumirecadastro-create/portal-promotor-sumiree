import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Code splitting - separa o código em chunks menores
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip'
          ],
          'icons-vendor': ['lucide-react'],
          'supabase-vendor': ['@supabase/supabase-js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  plugins: [react()],
  define: {
    'global': 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
