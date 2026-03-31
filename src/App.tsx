import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/use-auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Index from './pages/Index'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Index />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)

export default App
