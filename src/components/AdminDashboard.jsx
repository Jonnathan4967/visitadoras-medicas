import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { LogOut, Users, Eye, DollarSign, Download, Stethoscope, Plus, Trash2, X, Save } from 'lucide-react'
import ComisionesMensualesAdmin from './ComisionesMensualesAdmin'
import DetalleVisitadora from './DetalleVisitadora'
import ExportarReportes from './ExportarReportes'
import GestionMedicos from './GestionMedicos'
import BotonCreditos from './BotonCreditos'
import './Dashboard.css'

export default function AdminDashboard() {
  const logout = useAuthStore(state => state.logout)
  const [activeTab, setActiveTab] = useState('visitadoras')
  const [visitadoras, setVisitadoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [visitadoraSeleccionada, setVisitadoraSeleccionada] = useState(null)
  
  // Estados para agregar visitadora
  const [showAgregarModal, setShowAgregarModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    zona: ''
  })

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
      .eq('activo', true) // Solo visitadoras activas
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

  const handleVerDetalle = (visitadoraId) => {
    setVisitadoraSeleccionada(visitadoraId)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleAgregarVisitadora = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            role: 'visitadora'
          }
        }
      })

      if (authError) throw authError

      // 2. Actualizar perfil con información adicional
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          nombre: formData.nombre,
          zona: formData.zona,
          role: 'visitadora'
        })
        .eq('id', authData.user.id)

      if (profileError) throw profileError

      alert('✅ Visitadora agregada exitosamente')
      setShowAgregarModal(false)
      resetForm()
      loadVisitadoras()
    } catch (error) {
      alert('❌ Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarVisitadora = async (visitadoraId, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?\n\nEsta acción deshabilitará el acceso de la visitadora.`)) {
      return
    }

    try {
      console.log('Intentando eliminar visitadora:', visitadoraId)
      
      // 1. Marcar como inactivo en profiles
      const { data, error } = await supabase
        .from('profiles')
        .update({ activo: false })
        .eq('id', visitadoraId)
        .select()

      if (error) {
        console.error('Error de Supabase:', error)
        throw error
      }

      // 2. Deshabilitar usuario en Auth (requiere service_role key)
      // Como no podemos usar service_role desde el cliente, 
      // creamos una función RPC en Supabase
      const { error: authError } = await supabase.rpc('disable_user', {
        user_id: visitadoraId
      })

      if (authError) {
        console.warn('No se pudo deshabilitar en Auth, pero se marcó como inactivo:', authError)
      }

      console.log('Visitadora marcada como inactiva:', data)
      alert('✅ Visitadora eliminada exitosamente')
      loadVisitadoras()
    } catch (error) {
      console.error('Error completo:', error)
      alert('❌ Error al eliminar: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      nombre: '',
      zona: ''
    })
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Panel de Administrador</h1>
          <p>Sistema de Gestión de Visitadoras Médicas</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <BotonCreditos />
          <button onClick={logout} className="btn btn-secondary">
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="dashboard-content">
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
                  <button 
                    onClick={() => setShowAgregarModal(true)}
                    className="btn btn-primary"
                  >
                    <Plus size={18} />
                    Agregar Visitadora
                  </button>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Cargando...</p>
                  </div>
                ) : visitadoras.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    <Users size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                    <h3>No hay visitadoras registradas</h3>
                    <p>Agrega la primera visitadora para comenzar</p>
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
                            <td><strong>{v.nombre || 'Sin nombre'}</strong></td>
                            <td>{v.email}</td>
                            <td>{v.zona || 'No asignada'}</td>
                            <td>
                              <span className="badge badge-blue">{v.visitasHoy}</span>
                            </td>
                            <td>
                              <span className="badge badge-green">{v.totalVisitas}</span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="btn-icon" 
                                  title="Ver detalles"
                                  onClick={() => handleVerDetalle(v.id)}
                                >
                                  <Eye size={16} />
                                </button>
                                <button 
                                  className="btn-icon btn-danger" 
                                  title="Eliminar"
                                  onClick={() => handleEliminarVisitadora(v.id, v.nombre)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
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

            {activeTab === 'comisiones' && <ComisionesMensualesAdmin />}

            {activeTab === 'reportes' && (
              <div className="card">
                <ExportarReportes tipo="admin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Agregar Visitadora */}
      {showAgregarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Agregar Nueva Visitadora</h2>
              <button onClick={() => setShowAgregarModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAgregarVisitadora} className="visitadora-form">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  placeholder="Ej: María González"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Contraseña *</label>
                <input
                  type="password"
                  name="password"
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  minLength="6"
                  required
                />
              </div>

              <div className="form-group">
                <label>Zona (opcional)</label>
                <input
                  type="text"
                  name="zona"
                  className="input"
                  placeholder="Ej: Zona Norte, Chimaltenango, etc."
                  value={formData.zona}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAgregarModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={guardando}
                >
                  <Save size={16} />
                  {guardando ? 'Guardando...' : 'Guardar Visitadora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {visitadoraSeleccionada && (
        <DetalleVisitadora
          visitadoraId={visitadoraSeleccionada}
          onClose={() => setVisitadoraSeleccionada(null)}
        />
      )}
    </div>
  )
}