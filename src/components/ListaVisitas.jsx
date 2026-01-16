import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { ChevronDown, ChevronUp, MapPin, Calendar, FileText, Package, Clock, Search, Filter, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './ListaVisitas.css'

export default function ListaVisitas() {
  const user = useAuthStore(state => state.user)
  const [visitas, setVisitas] = useState([])
  const [visitasFiltradas, setVisitasFiltradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [isListExpanded, setIsListExpanded] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  const [filtros, setFiltros] = useState({
    busqueda: '',
    fechaInicio: '',
    fechaFin: '',
    tipo: ''
  })

  useEffect(() => {
    loadVisitas()
    
    // Escuchar evento de nueva visita registrada
    const handleVisitaRegistrada = () => {
      loadVisitas()
    }
    
    window.addEventListener('visitaRegistrada', handleVisitaRegistrada)
    
    return () => {
      window.removeEventListener('visitaRegistrada', handleVisitaRegistrada)
    }
  }, [user])

  useEffect(() => {
    aplicarFiltros()
  }, [visitas, filtros])

  const loadVisitas = async () => {
    setLoading(true)
    
    // Solo cargar visitas de hoy
    const hoy = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', user.id)
      .gte('created_at', `${hoy}T00:00:00`)
      .lte('created_at', `${hoy}T23:59:59`)
      .order('created_at', { ascending: false })

    if (data) {
      setVisitas(data)
      setVisitasFiltradas(data)
    }
    setLoading(false)
  }

  const aplicarFiltros = () => {
    let resultado = [...visitas]

    // Filtro por búsqueda (nombre o dirección)
    if (filtros.busqueda) {
      resultado = resultado.filter(v => 
        v.nombre_cliente.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        v.direccion.toLowerCase().includes(filtros.busqueda.toLowerCase())
      )
    }

    // Filtro por fecha inicio
    if (filtros.fechaInicio) {
      resultado = resultado.filter(v => 
        new Date(v.created_at) >= new Date(filtros.fechaInicio)
      )
    }

    // Filtro por fecha fin
    if (filtros.fechaFin) {
      const fechaFin = new Date(filtros.fechaFin)
      fechaFin.setHours(23, 59, 59, 999)
      resultado = resultado.filter(v => 
        new Date(v.created_at) <= fechaFin
      )
    }

    // Filtro por tipo de establecimiento
    if (filtros.tipo) {
      resultado = resultado.filter(v => v.tipo_establecimiento === filtros.tipo)
    }

    setVisitasFiltradas(resultado)
  }

  const handleFiltroChange = (e) => {
    setFiltros({
      ...filtros,
      [e.target.name]: e.target.value
    })
  }

  const limpiarFiltros = () => {
    setFiltros({
      busqueda: '',
      fechaInicio: '',
      fechaFin: '',
      tipo: ''
    })
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Cargando visitas...</p>
        </div>
      </div>
    )
  }

  if (visitas.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <FileText size={48} color="#9ca3af" />
          <h3>No hay visitas registradas</h3>
          <p>Las visitas que registres aparecerán aquí</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>Historial de Visitas</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {visitasFiltradas.length} de {visitas.length} {visitas.length === 1 ? 'visita' : 'visitas'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary btn-small ${showFilters ? 'active' : ''}`}
          >
            <Filter size={16} />
            Filtros
          </button>
          <button 
            onClick={() => setIsListExpanded(!isListExpanded)}
            className="btn btn-secondary btn-small"
          >
            {isListExpanded ? (
              <>
                <ChevronUp size={16} />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Mostrar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-item">
              <label>
                <Search size={14} />
                Buscar por nombre o dirección
              </label>
              <input
                type="text"
                name="busqueda"
                className="input"
                placeholder="Buscar..."
                value={filtros.busqueda}
                onChange={handleFiltroChange}
              />
            </div>

            <div className="filter-item">
              <label>Desde</label>
              <input
                type="date"
                name="fechaInicio"
                className="input"
                value={filtros.fechaInicio}
                onChange={handleFiltroChange}
              />
            </div>

            <div className="filter-item">
              <label>Hasta</label>
              <input
                type="date"
                name="fechaFin"
                className="input"
                value={filtros.fechaFin}
                onChange={handleFiltroChange}
              />
            </div>

            <div className="filter-item">
              <label>Tipo de Establecimiento</label>
              <select
                name="tipo"
                className="input"
                value={filtros.tipo}
                onChange={handleFiltroChange}
              >
                <option value="">Todos</option>
                <option value="Hospital">Hospital</option>
                <option value="Clínica">Clínica</option>
                <option value="Centro de Diagnóstico">Centro de Diagnóstico</option>
                <option value="Laboratorio">Laboratorio</option>
                <option value="Consultorio Médico">Consultorio Médico</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="filters-actions">
            <button onClick={limpiarFiltros} className="btn btn-secondary btn-small">
              <X size={14} />
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {isListExpanded && (
        visitasFiltradas.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No se encontraron visitas con estos filtros
          </div>
        ) : (
          <div className="visitas-list">
            {visitasFiltradas.map((visita) => (
          <div key={visita.id} className="visita-item">
            <div 
              className="visita-header"
              onClick={() => toggleExpand(visita.id)}
            >
              <div className="visita-info">
                <h4>{visita.nombre_cliente}</h4>
                <div className="visita-meta">
                  <span className="meta-item">
                    <Calendar size={14} />
                    {formatDate(visita.created_at)}
                  </span>
                  {visita.tipo_establecimiento && (
                    <span className="meta-item">
                      <FileText size={14} />
                      {visita.tipo_establecimiento}
                    </span>
                  )}
                </div>
              </div>
              <button className="expand-button">
                {expandedId === visita.id ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
            </div>

            {expandedId === visita.id && (
              <div className="visita-details">
                <div className="detail-section">
                  <h5>
                    <MapPin size={16} />
                    Información del Cliente
                  </h5>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Nombre:</span>
                      <span className="detail-value">{visita.nombre_cliente}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Dirección:</span>
                      <span className="detail-value">{visita.direccion}</span>
                    </div>
                    {visita.tipo_establecimiento && (
                      <div className="detail-item">
                        <span className="detail-label">Tipo:</span>
                        <span className="detail-value">{visita.tipo_establecimiento}</span>
                      </div>
                    )}
                  </div>
                </div>

                {visita.productos_presentados && visita.productos_presentados.length > 0 && (
                  <div className="detail-section">
                    <h5>
                      <Package size={16} />
                      Servicios/Estudios Presentados
                    </h5>
                    <div className="productos-list">
                      {visita.productos_presentados.map((producto, index) => (
                        <span key={index} className="producto-tag">
                          {producto}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {visita.observaciones && (
                  <div className="detail-section">
                    <h5>
                      <FileText size={16} />
                      Observaciones
                    </h5>
                    <p className="observaciones">{visita.observaciones}</p>
                  </div>
                )}

                {visita.latitud && visita.longitud && (
                  <div className="detail-section">
                    <h5>
                      <MapPin size={16} />
                      Ubicación GPS
                    </h5>
                    <div className="coordinates-display">
                      <span>Lat: {visita.latitud.toFixed(6)}</span>
                      <span>Long: {visita.longitud.toFixed(6)}</span>
                    </div>
                    <div className="map-container-small">
                      <MapContainer
                        center={[visita.latitud, visita.longitud]}
                        zoom={15}
                        style={{ height: '200px', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; OpenStreetMap'
                        />
                        <Marker position={[visita.latitud, visita.longitud]}>
                          <Popup>
                            {visita.nombre_cliente}
                            <br />
                            {visita.direccion}
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                )}

                {visita.firma_url && (
                  <div className="detail-section">
                    <h5>
                      <FileText size={16} />
                      Firma Digital
                    </h5>
                    <div className="firma-container">
                      <img 
                        src={visita.firma_url} 
                        alt="Firma" 
                        className="firma-image"
                      />
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <div className="timestamp">
                    <Clock size={14} />
                    Registrada el {formatDate(visita.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
        )
      )}
    </div>
  )
}