import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { LogOut, Users, Eye, DollarSign, Download, Stethoscope } from 'lucide-react'
import ComisionesMedicos from './ComisionesMedicos'
import DetalleVisitadora from './DetalleVisitadora'
import ExportarReportes from './ExportarReportes'
import GestionMedicos from './GestionMedicos'
import Footer from './Footer'
import './Dashboard.css'

export default function AdminDashboard() {
  const logout = useAuthStore(state => state.logout)
  const [activeTab, setActiveTab] = useState('visitadoras')
  const [visitadoras, setVisitadoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [visitadoraSeleccionada, setVisitadoraSeleccionada] = useState(null)

  useEffect(() => {
    if (activeTab === 'visitadoras') {
      loadVisitadoras()
    }
  }, [activeTab])

  const loadVisitadoras = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'visitadora')
      .order('nombre')

    if (data) {
      // Cargar estadísticas para cada visitadora
      const visitadorasConStats = await Promise.all(
        data.map(async (v) => {
          const { count: totalVisitas } = await supabase
            .from('visitas')
            .select('*', { count: 'exact', head: true })
            .eq('visitadora_id', v.id)

          const hoy = new Date().toISOString().split('T')[0]
          const { count: visitasHoy } = await supabase
            .from('visitas')
            .select('*', { count: 'exact', head: true })
            .eq('visitadora_id', v.id)
            .gte('created_at', `${hoy}T00:00:00`)
            .lte('created_at', `${hoy}T23:59:59`)

          return {
            ...v,
            totalVisitas: totalVisitas || 0,
            visitasHoy: visitasHoy || 0
          }
        })
      )

      setVisitadoras(visitadorasConStats)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
  }

  const handleVerDetalle = (visitadoraId) => {
    setVisitadoraSeleccionada(visitadoraId)
  }

  const handleCerrarDetalle = () => {
    setVisitadoraSeleccionada(null)
    loadVisitadoras() // Recargar por si se editó algo
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h2>Panel de Administrador</h2>
        <button onClick={handleLogout} className="btn btn-secondary">
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </nav>

      <div className="dashboard-content">
        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'visitadoras' ? 'active' : ''}`}
              onClick={() => setActiveTab('visitadoras')}
            >
              <Users size={18} />
              Visitadoras
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
            {activeTab === 'visitadoras' && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Visitadoras Médicas</h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
                      Gestión y seguimiento de visitadoras
                    </p>
                  </div>
                  <Users size={24} color="#3b82f6" />
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : visitadoras.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No hay visitadoras registradas
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Zona</th>
                          <th>Visitas Hoy</th>
                          <th>Total Visitas</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitadoras.map((v) => (
                          <tr key={v.id}>
                            <td>{v.nombre || 'Sin nombre'}</td>
                            <td>{v.email}</td>
                            <td>{v.zona || 'No asignada'}</td>
                            <td>
                              <span className="badge badge-blue">{v.visitasHoy}</span>
                            </td>
                            <td>
                              <span className="badge badge-green">{v.totalVisitas}</span>
                            </td>
                            <td>
                              <button 
                                className="btn-icon" 
                                title="Ver detalles"
                                onClick={() => handleVerDetalle(v.id)}
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'medicos' && <GestionMedicos />}

            {activeTab === 'comisiones' && <ComisionesMedicos />}

            {activeTab === 'reportes' && (
              <div className="card">
                <ExportarReportes tipo="admin" />
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Modal de Detalle */}
      {visitadoraSeleccionada && (
        <DetalleVisitadora
          visitadoraId={visitadoraSeleccionada}
          onClose={handleCerrarDetalle}
        />
      )}
    </div>
  )
}