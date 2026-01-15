import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  X, User, MapPin, Phone, Mail, Calendar, TrendingUp, 
  DollarSign, FileText, ChevronDown, ChevronUp, Save, Edit2
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './DetalleVisitadora.css'

export default function DetalleVisitadora({ visitadoraId, onClose }) {
  const [visitadora, setVisitadora] = useState(null)
  const [visitas, setVisitas] = useState([])
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedVisitaId, setExpandedVisitaId] = useState(null)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    zona: '',
    telefono: ''
  })

  useEffect(() => {
    loadData()
  }, [visitadoraId])

  const loadData = async () => {
    setLoading(true)

    // Cargar perfil de visitadora
    const { data: perfilData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', visitadoraId)
      .single()

    if (perfilData) {
      setVisitadora(perfilData)
      setFormData({
        nombre: perfilData.nombre || '',
        zona: perfilData.zona || '',
        telefono: perfilData.telefono || ''
      })
    }

    // Cargar visitas
    const { data: visitasData } = await supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', visitadoraId)
      .order('created_at', { ascending: false })

    if (visitasData) {
      setVisitas(visitasData)
    }

    // Cargar comisiones
    const { data: comisionesData } = await supabase
      .from('comisiones')
      .select('*')
      .eq('visitadora_id', visitadoraId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (comisionesData) {
      setComisiones(comisionesData)
    }

    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleGuardar = async () => {
    setGuardando(true)
    
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: formData.nombre,
        zona: formData.zona,
        telefono: formData.telefono
      })
      .eq('id', visitadoraId)

    if (!error) {
      setVisitadora({ ...visitadora, ...formData })
      setEditando(false)
    }
    
    setGuardando(false)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMesNombre = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[mes - 1]
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto)
  }

  // Calcular estadísticas
  const stats = {
    totalVisitas: visitas.length,
    visitasHoy: visitas.filter(v => {
      const hoy = new Date().toISOString().split('T')[0]
      const visitaFecha = v.created_at.split('T')[0]
      return visitaFecha === hoy
    }).length,
    comisionesPendientes: comisiones
      .filter(c => c.estado === 'pendiente')
      .reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0),
    comisionesPagadas: comisiones
      .filter(c => c.estado === 'pagado')
      .reduce((sum, c) => sum + parseFloat(c.monto_pagado || 0), 0)
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Cargando información...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>Detalle de Visitadora</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="detalle-content">
          {/* Información Personal */}
          <div className="info-card">
            <div className="info-header">
              <div className="info-title">
                <User size={20} />
                <h3>Información Personal</h3>
              </div>
              {!editando && (
                <button 
                  onClick={() => setEditando(true)}
                  className="btn btn-secondary btn-small"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
              )}
            </div>

            {editando ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    name="nombre"
                    type="text"
                    className="input"
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Zona</label>
                  <input
                    name="zona"
                    type="text"
                    className="input"
                    value={formData.zona}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    name="telefono"
                    type="text"
                    className="input"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
                <div className="edit-actions">
                  <button 
                    onClick={() => setEditando(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGuardar}
                    className="btn btn-success"
                    disabled={guardando}
                  >
                    <Save size={16} />
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <Mail size={16} />
                  <div>
                    <span className="info-label">Email</span>
                    <span className="info-value">{visitadora.email}</span>
                  </div>
                </div>
                <div className="info-item">
                  <User size={16} />
                  <div>
                    <span className="info-label">Nombre</span>
                    <span className="info-value">{visitadora.nombre || 'No asignado'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <MapPin size={16} />
                  <div>
                    <span className="info-label">Zona</span>
                    <span className="info-value">{visitadora.zona || 'No asignada'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <Phone size={16} />
                  <div>
                    <span className="info-label">Teléfono</span>
                    <span className="info-value">{visitadora.telefono || 'No asignado'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estadísticas */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
                <Calendar size={20} color="#3b82f6" />
              </div>
              <div>
                <p className="stat-label">Visitas Hoy</p>
                <p className="stat-number">{stats.visitasHoy}</p>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                <TrendingUp size={20} color="#10b981" />
              </div>
              <div>
                <p className="stat-label">Total Visitas</p>
                <p className="stat-number">{stats.totalVisitas}</p>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
                <DollarSign size={20} color="#f59e0b" />
              </div>
              <div>
                <p className="stat-label">Pendiente</p>
                <p className="stat-number">{formatMonto(stats.comisionesPendientes)}</p>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                <DollarSign size={20} color="#10b981" />
              </div>
              <div>
                <p className="stat-label">Pagado</p>
                <p className="stat-number">{formatMonto(stats.comisionesPagadas)}</p>
              </div>
            </div>
          </div>

          {/* Comisiones */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <DollarSign size={20} />
                Comisiones
              </h3>
            </div>
            {comisiones.length === 0 ? (
              <p className="empty-text">No hay comisiones registradas</p>
            ) : (
              <div className="table-responsive">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Visitas</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comisiones.slice(0, 5).map((comision) => (
                      <tr key={comision.id}>
                        <td>{getMesNombre(comision.mes)} {comision.anio}</td>
                        <td>{comision.total_visitas}</td>
                        <td><strong>{formatMonto(comision.monto_comision)}</strong></td>
                        <td>
                          <span className={`status-badge status-${comision.estado}`}>
                            {comision.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Visitas Recientes */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <FileText size={20} />
                Visitas Recientes
              </h3>
            </div>
            {visitas.length === 0 ? (
              <p className="empty-text">No hay visitas registradas</p>
            ) : (
              <div className="visitas-list-detalle">
                {visitas.slice(0, 10).map((visita) => (
                  <div key={visita.id} className="visita-item-detalle">
                    <div 
                      className="visita-header-detalle"
                      onClick={() => setExpandedVisitaId(
                        expandedVisitaId === visita.id ? null : visita.id
                      )}
                    >
                      <div>
                        <h4>{visita.nombre_cliente}</h4>
                        <p className="visita-meta">{formatDate(visita.created_at)}</p>
                      </div>
                      {expandedVisitaId === visita.id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </div>

                    {expandedVisitaId === visita.id && (
                      <div className="visita-details-detalle">
                        <p><strong>Dirección:</strong> {visita.direccion}</p>
                        {visita.tipo_establecimiento && (
                          <p><strong>Tipo:</strong> {visita.tipo_establecimiento}</p>
                        )}
                        {visita.observaciones && (
                          <p><strong>Observaciones:</strong> {visita.observaciones}</p>
                        )}
                        {visita.latitud && visita.longitud && (
                          <div className="map-container-mini">
                            <MapContainer
                              center={[visita.latitud, visita.longitud]}
                              zoom={13}
                              style={{ height: '150px', width: '100%' }}
                              scrollWheelZoom={false}
                            >
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[visita.latitud, visita.longitud]}>
                                <Popup>{visita.nombre_cliente}</Popup>
                              </Marker>
                            </MapContainer>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}