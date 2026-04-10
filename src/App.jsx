import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthPage    from './pages/AuthPage'
import OnboardPage from './pages/OnboardPage'
import Dashboard   from './pages/Dashboard'
import Loading     from './components/Loading'
import Cursor      from './components/Cursor'

export default function App() {
  const { session, profile } = useAuth()

  if (session === undefined) return <><Cursor /><Loading /></>
  if (!session)              return <><Cursor /><Routes><Route path="*" element={<AuthPage />} /></Routes></>
  if (!profile?.display_name) return <><Cursor /><Routes><Route path="*" element={<OnboardPage />} /></Routes></>

  return (
    <>
      <Cursor />
      <Routes>
        <Route path="/*" element={<Dashboard />} />
      </Routes>
    </>
  )
}
