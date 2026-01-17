import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { LogIn } from 'lucide-react'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const setUser = useAuthStore(state => state.setUser)
  const setIsAdmin = useAuthStore(state => state.setIsAdmin)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Verificar perfil y si está activo
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, activo')
        .eq('id', data.user.id)
        .single()

      // Verificar si el usuario está activo
      if (profile?.activo === false) {
        // Cerrar sesión inmediatamente
        await supabase.auth.signOut()
        throw new Error('Tu cuenta ha sido desactivada. Contacta al administrador.')
      }

      setUser(data.user)
      setIsAdmin(profile?.role === 'admin')
      
    } catch (error) {
      setError(error.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card card">
        <div className="login-header">
          <LogIn size={48} color="#3b82f6" />
          <h1>Visitadoras Médicas</h1>
          <p>Sistema de Gestión de Visitas</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}