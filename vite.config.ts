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
    // Otimizações de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // Remove console.log em produção
        drop_debugger: true,      // Remove debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug'] // Remove logs específicos
      }
    },
    // Code splitting - separa o código em chunks menores
    rollupOptions: {
      output: {
        manualChunks: {
          // Bibliotecas principais separadas
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Componentes UI
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dropdown-menu'
          ],
          // Ícones (pesados)
          'icons-vendor': ['lucide-react'],
          // Gráficos (se usar recharts)
          'charts-vendor': ['recharts'],
          // Formulários
          'forms-vendor': ['react-hook-form', 'zod'],
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js']
        },
        // Otimiza nomes dos arquivos
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Aumenta o limite de aviso de chunks grandes (opcional)
    chunkSizeWarningLimit: 1000
  },
  plugins: [react()],
  define: {
    'global': 'window',
    // Remove process.env em produção
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Otimiza dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@supabase/supabase-js'
    ],
    exclude: []
  },
  // Configuração de desenvolvimento
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
