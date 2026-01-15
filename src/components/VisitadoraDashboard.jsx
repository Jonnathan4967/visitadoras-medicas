import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { LogOut, MapPin, Calendar, TrendingUp, Plus, FileText, DollarSign, Download } from 'lucide-react'
import RegistrarVisita from './RegistrarVisita'
import ListaVisitas from './ListaVisitas'
import ComisionesVisitadora from './ComisionesVisitadora'
import ExportarReportes from './ExportarReportes'
import './Dashboard.css'

export default function VisitadoraDashboard() {
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('visitas')
  const [stats, setStats] = useState({
    totalVisitas: 0,
    visitasHoy: 0,
    zona: ''
  })
  const [profile, setProfile] = useState(null)
  const [showRegistrarVisita, setShowRegistrarVisita] = useState(false)

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [user])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    setProfile(data)
    setStats(prev => ({ ...prev, zona: data?.zona || 'No asignada' }))
  }

  const loadStats = async () => {
    // Visitas totales
    const { count: total } = await supabase
      .from('visitas')
      .select('*', { count: 'exact', head: true })
      .eq('visitadora_id', user.id)

    // Visitas de hoy
    const hoy = new Date().toISOString().split('T')[0]
    const { count: hoy_count } = await supabase
      .from('visitas')
      .select('*', { count: 'exact', head: true })
      .eq('visitadora_id', user.id)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)

    setStats(prev => ({
      ...prev,
      totalVisitas: total || 0,
      visitasHoy: hoy_count || 0
    }))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
  }

  const handleVisitaRegistrada = () => {
    setShowRegistrarVisita(false)
    loadStats() // Recargar estadísticas
    // Trigger para recargar lista de visitas
    window.dispatchEvent(new Event('visitaRegistrada'))
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Panel de Visitadora</h2>
        <button onClick={handleLogout} className="btn btn-secondary">
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </nav>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card card">
            <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
              <Calendar size={24} color="#3b82f6" />
            </div>
            <div className="stat-info">
              <p className="stat-label">Visitas Hoy</p>
              <h3 className="stat-value">{stats.visitasHoy}</h3>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div className="stat-info">
              <p className="stat-label">Total Visitas</p>
              <h3 className="stat-value">{stats.totalVisitas}</h3>
            </div>
          </div>

          <div className="stat-card card">
            <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
              <MapPin size={24} color="#f59e0b" />
            </div>
            <div className="stat-info">
              <p className="stat-label">Zona Asignada</p>
              <h3 className="stat-value">{stats.zona}</h3>
            </div>
          </div>
        </div>

        <div className="main-sections">
          <div className="card">
            <div className="card-header">
              <div>
                <h3>Bienvenida, {profile?.nombre || 'Visitadora'}</h3>
                <p style={{ marginTop: '4px', color: '#6b7280', fontSize: '14px' }}>
                  Registra tus visitas y mantén tu historial actualizado
                </p>
              </div>
              <button 
                onClick={() => setShowRegistrarVisita(true)}
                className="btn btn-primary"
              >
                <Plus size={20} />
                Registrar Visita
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'visitas' ? 'active' : ''}`}
                onClick={() => setActiveTab('visitas')}
              >
                <FileText size={18} />
                Mis Visitas
              </button>
              <button
                className={`tab ${activeTab === 'comisiones' ? 'active' : ''}`}
                onClick={() => setActiveTab('comisiones')}
              >
                <DollarSign size={18} />
                Comisiones
              </button>
              <button
                className={`tab ${activeTab === 'reportes' ? 'active' : ''}`}
                onClick={() => setActiveTab('reportes')}
              >
                <Download size={18} />
                Reportes
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'visitas' && <ListaVisitas />}
              {activeTab === 'comisiones' && <ComisionesVisitadora />}
              {activeTab === 'reportes' && (
                <div className="card">
                  <ExportarReportes tipo="visitadora" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showRegistrarVisita && (
        <RegistrarVisita
          onClose={() => setShowRegistrarVisita(false)}
          onSuccess={handleVisitaRegistrada}
        />
      )}
    </div>
  )
}