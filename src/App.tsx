import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/Index'

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="*" element={<div>Rota não encontrada</div>} />
    </Routes>
  </BrowserRouter>
)

export default App
