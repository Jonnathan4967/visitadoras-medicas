import { useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { useAuthStore } from './store/authStore'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import VisitadoraDashboard from './components/VisitadoraDashboard'
import './index.css'

function App() {
  const { user, isAdmin, loading, setUser, setIsAdmin } = useAuthStore()

  useEffect(() => {
    // Verificar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserRole(session.user)
      } else {
        setUser(null)
      }
    })

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkUserRole(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUserRole = async (user) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, activo')
      .eq('id', user.id)
      .single()

    // Si el usuario está inactivo, cerrar sesión
    if (data?.activo === false) {
      await supabase.auth.signOut()
      setUser(null)
      return
    }

    setUser(user)
    setIsAdmin(data?.role === 'admin')
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return isAdmin ? <AdminDashboard /> : <VisitadoraDashboard />
}

export default App