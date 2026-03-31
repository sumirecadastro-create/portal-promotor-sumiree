import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-blue-600">LAYOUT TESTE</h1>
      <Outlet />
    </div>
  )
}
