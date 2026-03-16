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
import Categorias from './pages/Categorias'
import Marcas from './pages/Marcas'
import Relatorios from './pages/Relatorios'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/lojas" element={<Lojas />} />
          <Route path="/lojas/:id" element={<LojaDetail />} />
          <Route path="/promotores" element={<Promotores />} />
          <Route path="/promotores/:id" element={<PromotorDetail />} />
          <Route path="/check-in" element={<CheckIn />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/marcas" element={<Marcas />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
