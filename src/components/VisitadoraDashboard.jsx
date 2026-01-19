import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { LogOut, MapPin, Calendar, TrendingUp, Plus, FileText, DollarSign, Download, Stethoscope } from 'lucide-react'
import RegistrarVisita from './RegistrarVisita'
import ListaVisitas from './ListaVisitas'
import ComisionesMensualesVisitadora from './ComisionesMensualesVisitadora'
import ExportarReportes from './ExportarReportes'
import MedicosVisitadora from './MedicosVisitadora'
import BotonCreditos from './BotonCreditos'
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
    loadStats()
    window.dispatchEvent(new Event('visitaRegistrada'))
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Panel de Visitadora</h1>
          <p>Sistema de Gestión de Visitadoras Médicas</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <BotonCreditos compact />
          <button onClick={handleLogout} className="btn btn-secondary">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Stats Cards */}
        <div className="stats-grid-visitadora">
          <div className="stat-card-visitadora">
            <div className="stat-icon-visitadora" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
              <Calendar size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Visitas Hoy</p>
              <h3 className="stat-number">{stats.visitasHoy}</h3>
            </div>
          </div>

          <div className="stat-card-visitadora">
            <div className="stat-icon-visitadora" style={{ backgroundColor: '#dcfce7', color: '#10b981' }}>
              <TrendingUp size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Visitas</p>
              <h3 className="stat-number">{stats.totalVisitas}</h3>
            </div>
          </div>

          <div className="stat-card-visitadora">
            <div className="stat-icon-visitadora" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
              <MapPin size={28} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Zona Asignada</p>
              <h3 className="stat-zona">{stats.zona}</h3>
            </div>
          </div>
        </div>

        {/* Botón Registrar Visita */}
        <div style={{ marginTop: '24px', marginBottom: '24px' }}>
          <button 
            onClick={() => setShowRegistrarVisita(true)}
            className="btn btn-primary btn-large"
          >
            <Plus size={20} />
            Registrar Visita
          </button>
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
              className={`tab ${activeTab === 'medicos' ? 'active' : ''}`}
              onClick={() => setActiveTab('medicos')}
            >
              <Stethoscope size={18} />
              Médicos
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
            {activeTab === 'medicos' && <MedicosVisitadora />}
            {activeTab === 'comisiones' && <ComisionesMensualesVisitadora />}
            {activeTab === 'reportes' && (
              <div className="card">
                <ExportarReportes tipo="visitadora" />
              </div>
            )}
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