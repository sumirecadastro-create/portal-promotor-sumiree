import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Index from './pages/Index'
import Lojas from './pages/Lojas'
import LojaDetail from './pages/LojaDetail'
import Promotores from './pages/Promotores'
import PromotorDetail from './pages/PromotorDetail'
import CheckIn from './pages/CheckIn'
import CadastroPromotores from './pages/CadastroPromotores'
import Marcas from './pages/Marcas'
import Acoes from './pages/Acoes'
import Relatorios from './pages/Relatorios'
import Campanhas from './pages/Campanhas' 
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import { AuthProvider } from './hooks/use-auth'
import { ProtectedRoute } from './components/ProtectedRoute'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/lojas" element={<Lojas />} />
              <Route path="/lojas/:id" element={<LojaDetail />} />
              <Route path="/promotores" element={<Promotores />} />
              <Route path="/promotores/:id" element={<PromotorDetail />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/cadastropromotores" element={<CadastroPromotores />} />
              <Route path="/marcas" element={<Marcas />} />
              <Route path="/acoes" element={<Acoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/campanhas" element={<Campanhas />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
