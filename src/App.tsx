import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import { AuthProvider } from './hooks/use-auth'

// Componente de loading enquanto as páginas carregam
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
      <p className="text-gray-500">Carregando...</p>
    </div>
  </div>
)

// Lazy loading - cada página carrega sob demanda
const Index = lazy(() => import('./pages/Index'))
const Lojas = lazy(() => import('./pages/Lojas'))
const LojaDetail = lazy(() => import('./pages/LojaDetail'))
const Promotores = lazy(() => import('./pages/Promotores'))
const PromotorDetail = lazy(() => import('./pages/PromotorDetail'))
const CheckIn = lazy(() => import('./pages/CheckIn'))
const CadastroUsuarios = lazy(() => import('./pages/CadastroUsuarios'))
const Marcas = lazy(() => import('./pages/Marcas'))
const Acoes = lazy(() => import('./pages/Acoes'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Campanhas = lazy(() => import('./pages/Campanhas'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/lojas" element={<Lojas />} />
              <Route path="/lojas/:id" element={<LojaDetail />} />
              <Route path="/promotores" element={<Promotores />} />
              <Route path="/promotores/:id" element={<PromotorDetail />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/cadastro-usuarios" element={<CadastroUsuarios />} />
              <Route path="/marcas" element={<Marcas />} />
              <Route path="/acoes" element={<Acoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
