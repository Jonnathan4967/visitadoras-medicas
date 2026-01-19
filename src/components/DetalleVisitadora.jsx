import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  X, User, MapPin, Phone, Mail, Calendar, TrendingUp, 
  DollarSign, FileText, ChevronDown, ChevronUp, Save, Edit2, Search
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
  
  // Estados para filtros
  const [filtroVisitas, setFiltroVisitas] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [filtroComisiones, setFiltroComisiones] = useState('')
  
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

  // Convertir fecha UTC a fecha local de Guatemala (GMT-6)
  const convertirAFechaGuatemala = (dateString) => {
    const fecha = new Date(dateString)
    // Convertir a zona horaria de Guatemala (GMT-6)
    const fechaGuatemala = new Date(fecha.toLocaleString('en-US', { timeZone: 'America/Guatemala' }))
    return fechaGuatemala
  }

  // Obtener fecha en formato YYYY-MM-DD para Guatemala
  const getFechaLocalString = (dateString) => {
    const fecha = convertirAFechaGuatemala(dateString)
    const year = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, '0')
    const day = String(fecha.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDate = (dateString) => {
    const fecha = convertirAFechaGuatemala(dateString)
    return fecha.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateOnly = (dateString) => {
    // Si viene en formato YYYY-MM-DD, crear la fecha directamente
    const [year, month, day] = dateString.split('-').map(Number)
    const fecha = new Date(year, month - 1, day)
    
    return fecha.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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

  // Filtrar visitas según búsqueda Y fecha
  const visitasFiltradas = visitas.filter(visita => {
    // Filtro por fecha - usando zona horaria de Guatemala
    if (fechaSeleccionada) {
      const visitaFecha = getFechaLocalString(visita.created_at)
      if (visitaFecha !== fechaSeleccionada) return false
    }

    // Filtro por texto de búsqueda
    if (!filtroVisitas) return true
    const searchTerm = filtroVisitas.toLowerCase()
    return (
      visita.nombre_cliente?.toLowerCase().includes(searchTerm) ||
      visita.direccion?.toLowerCase().includes(searchTerm) ||
      visita.tipo_establecimiento?.toLowerCase().includes(searchTerm) ||
      visita.observaciones?.toLowerCase().includes(searchTerm)
    )
  })

  // Agrupar visitas por fecha (usando zona horaria de Guatemala)
  const visitasPorDia = visitasFiltradas.reduce((grupos, visita) => {
    const fecha = getFechaLocalString(visita.created_at)
    if (!grupos[fecha]) {
      grupos[fecha] = []
    }
    grupos[fecha].push(visita)
    return grupos
  }, {})

  // Ordenar las fechas de más reciente a más antigua
  const fechasOrdenadas = Object.keys(visitasPorDia).sort((a, b) => b.localeCompare(a))

  // Filtrar comisiones según búsqueda
  const comisionesFiltradas = comisiones.filter(comision => {
    if (!filtroComisiones) return true
    const searchTerm = filtroComisiones.toLowerCase()
    const periodo = `${getMesNombre(comision.mes)} ${comision.anio}`.toLowerCase()
    const estado = comision.estado.toLowerCase()
    return periodo.includes(searchTerm) || estado.includes(searchTerm)
  })

  // Calcular estadísticas usando zona horaria de Guatemala
  const stats = {
    totalVisitas: visitas.length,
    visitasHoy: visitas.filter(v => {
      const hoy = new Date()
      const year = hoy.getFullYear()
      const month = String(hoy.getMonth() + 1).padStart(2, '0')
      const day = String(hoy.getDate()).padStart(2, '0')
      const hoyString = `${year}-${month}-${day}`
      
      const visitaFecha = getFechaLocalString(v.created_at)
      return visitaFecha === hoyString
    }).length,
    comisionesPagadas: comisiones
      .filter(c => c.estado === 'pagado')
      .reduce((sum, c) => sum + parseFloat(c.monto_pagado || 0), 0)
  }

  const limpiarFiltros = () => {
    setFiltroVisitas('')
    setFechaSeleccionada('')
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

          {/* Estadísticas - SIN "Pendiente" */}
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
              <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                <DollarSign size={20} color="#10b981" />
              </div>
              <div>
                <p className="stat-label">Comisiones Pagadas</p>
                <p className="stat-number">{formatMonto(stats.comisionesPagadas)}</p>
              </div>
            </div>
          </div>

          {/* Comisiones con Filtro */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <DollarSign size={20} />
                Comisiones
              </h3>
              <div className="search-box" style={{ maxWidth: '300px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por período o estado..."
                  value={filtroComisiones}
                  onChange={(e) => setFiltroComisiones(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            {comisionesFiltradas.length === 0 ? (
              <p className="empty-text">
                {filtroComisiones ? 'No se encontraron comisiones con ese criterio' : 'No hay comisiones registradas'}
              </p>
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
                    {comisionesFiltradas.map((comision) => (
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

          {/* Visitas Recientes con Filtros */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <FileText size={20} />
                Visitas ({visitasFiltradas.length})
              </h3>
            </div>

            {/* Filtros de búsqueda */}
            <div className="filtros-container">
              <div className="filtro-grupo">
                <label className="filtro-label">Buscar por fecha:</label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="input-date"
                />
              </div>

              <div className="filtro-grupo">
                <label className="filtro-label">Buscar por texto:</label>
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Cliente, dirección, tipo..."
                    value={filtroVisitas}
                    onChange={(e) => setFiltroVisitas(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              {(filtroVisitas || fechaSeleccionada) && (
                <button 
                  onClick={limpiarFiltros}
                  className="btn btn-secondary btn-small"
                  style={{ alignSelf: 'flex-end' }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {visitasFiltradas.length === 0 ? (
              <p className="empty-text">
                {(filtroVisitas || fechaSeleccionada) 
                  ? 'No se encontraron visitas con ese criterio' 
                  : 'No hay visitas registradas'}
              </p>
            ) : (
              <div className="visitas-por-dia">
                {fechasOrdenadas.map((fecha) => (
                  <div key={fecha} className="dia-grupo">
                    <div className="dia-header">
                      <Calendar size={16} />
                      <h4>{formatDateOnly(fecha)}</h4>
                      <span className="dia-contador">
                        {visitasPorDia[fecha].length} {visitasPorDia[fecha].length === 1 ? 'visita' : 'visitas'}
                      </span>
                    </div>

                    <div className="visitas-list-detalle">
                      {visitasPorDia[fecha].map((visita) => (
                        <div key={visita.id} className="visita-item-detalle">
                          <div 
                            className="visita-header-detalle"
                            onClick={() => setExpandedVisitaId(
                              expandedVisitaId === visita.id ? null : visita.id
                            )}
                          >
                            <div>
                              <h4>{visita.nombre_cliente}</h4>
                              <p className="visita-meta">
                                {convertirAFechaGuatemala(visita.created_at).toLocaleTimeString('es-GT', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {expandedVisitaId === visita.id ? (
                              <ChevronUp size={20} />
                            ) : (
                              <ChevronDown size={20} />
                            )}
                          </div>

                          {expandedVisitaId === visita.id && (
                            <div className="visita-details-detalle">
                              <div className="detail-row">
                                <p><strong>Dirección:</strong> {visita.direccion}</p>
                              </div>
                              
                              {visita.tipo_establecimiento && (
                                <div className="detail-row">
                                  <p><strong>Tipo:</strong> {visita.tipo_establecimiento}</p>
                                </div>
                              )}

                              {visita.productos_presentados && visita.productos_presentados.length > 0 && (
                                <div className="detail-row">
                                  <p><strong>Servicios/Estudios:</strong></p>
                                  <div className="servicios-tags">
                                    {visita.productos_presentados.map((servicio, index) => (
                                      <span key={index} className="servicio-tag">
                                        {servicio}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {visita.observaciones && (
                                <div className="detail-row">
                                  <p><strong>Observaciones:</strong> {visita.observaciones}</p>
                                </div>
                              )}

                              {visita.latitud && visita.longitud && (
                                <div className="detail-row">
                                  <p><strong>Ubicación GPS:</strong></p>
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
                                </div>
                              )}

                              {visita.firma_url && (
                                <div className="detail-row">
                                  <p><strong>Firma del Cliente:</strong></p>
                                  <div className="firma-display">
                                    <img 
                                      src={visita.firma_url} 
                                      alt="Firma del cliente" 
                                      className="firma-imagen"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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