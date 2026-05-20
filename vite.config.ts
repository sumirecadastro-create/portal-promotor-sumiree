import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Plugin para corrigir o jsxDEV
function fixJsxDev() {
  return {
    name: 'fix-jsx-dev',
    transform(code, id) {
      if (id.includes('react/jsx-dev-runtime')) {
        console.log('🔧 Corrigindo jsx-dev-runtime...')
        return code.replace(
          'exports.jsxDEV = jsxDEV;',
          'exports.jsxDEV = jsxDEV; window.jsxDEV = jsxDEV;'
        )
      }
      return code
    },
  }
}

export default defineConfig({
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
  plugins: [react(), fixJsxDev()],
  define: {
    'global': 'window',
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.browser': true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-dev-runtime', 'react/jsx-runtime'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
})
