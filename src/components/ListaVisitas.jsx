import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { ChevronDown, ChevronUp, MapPin, Calendar, FileText } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './ListaVisitas.css'

export default function ListaVisitas() {
  const user = useAuthStore(state => state.user)
  const [visitas, setVisitas] = useState([])
  const [visitasFiltradas, setVisitasFiltradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  
  // Nuevo: Toggle de vista
  const [vistaHistorial, setVistaHistorial] = useState(false) // false = Solo hoy, true = Todas

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
  }, [user, vistaHistorial]) // Recargar cuando cambie la vista

  const loadVisitas = async () => {
    setLoading(true)
    
    let query = supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', user.id)
      .order('created_at', { ascending: false })
    
    // Si NO está en vista historial, solo cargar visitas de hoy
    if (!vistaHistorial) {
      const hoy = new Date().toISOString().split('T')[0]
      query = query
        .gte('created_at', `${hoy}T00:00:00`)
        .lte('created_at', `${hoy}T23:59:59`)
    }

    const { data, error } = await query

    if (data) {
      setVisitas(data)
      setVisitasFiltradas(data)
    }
    setLoading(false)
  }

  const toggleVista = () => {
    setVistaHistorial(!vistaHistorial)
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando visitas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lista-visitas">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Mis Visitas</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {vistaHistorial 
                ? `${visitasFiltradas.length} visitas en total`
                : `${visitasFiltradas.length} visitas hoy`
              }
            </p>
          </div>
        </div>

        {/* Toggle Vista */}
        <div className="vista-toggle-section">
          <div className="toggle-buttons">
            <button
              className={`toggle-btn ${!vistaHistorial ? 'active' : ''}`}
              onClick={() => !vistaHistorial || toggleVista()}
            >
              <Calendar size={16} />
              Solo Hoy
            </button>
            <button
              className={`toggle-btn ${vistaHistorial ? 'active' : ''}`}
              onClick={() => vistaHistorial || toggleVista()}
            >
              <FileText size={16} />
              Historial Completo
            </button>
          </div>
        </div>

        {/* Filtros (solo en vista historial) */}
        {/* FILTROS REMOVIDOS - Vista más limpia */}

        {/* Buscador simple (vista hoy) */}
        {/* BUSCADOR REMOVIDO - Vista más limpia */}

        {/* Lista de Visitas */}
        <div className="visitas-container">
          {visitasFiltradas.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} color="#9ca3af" />
              <h3>
                {vistaHistorial 
                  ? 'No tienes visitas registradas'
                  : 'No has registrado visitas hoy'
                }
              </h3>
              <p>
                {vistaHistorial
                  ? 'El historial completo de visitas aparecerá aquí'
                  : 'Las visitas que registres aparecerán aquí'
                }
              </p>
            </div>
          ) : (
            <div className="visitas-list">
              {visitasFiltradas.map((visita) => (
                <div key={visita.id} className="visita-card">
                  <div className="visita-header" onClick={() => toggleExpand(visita.id)}>
                    <div className="visita-info">
                      <h4>{visita.nombre_cliente}</h4>
                      <div className="visita-meta">
                        <span className="meta-item">
                          <Calendar size={14} />
                          {new Date(visita.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="meta-item">
                          <Clock size={14} />
                          {new Date(visita.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="meta-item">
                          <MapPin size={14} />
                          {visita.tipo_establecimiento}
                        </span>
                      </div>
                    </div>
                    <button className="expand-btn">
                      {expandedId === visita.id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                  </div>

                  {expandedId === visita.id && (
                    <div className="visita-detalles">
                      <div className="detalle-section">
                        <h5>Información</h5>
                        <div className="detalle-grid">
                          <div className="detalle-item">
                            <span className="label">Dirección:</span>
                            <span className="value">{visita.direccion}</span>
                          </div>
                          <div className="detalle-item">
                            <span className="label">Tipo:</span>
                            <span className="value">{visita.tipo_establecimiento}</span>
                          </div>
                        </div>
                      </div>

                      {visita.productos_presentados && typeof visita.productos_presentados === 'string' && visita.productos_presentados.trim() !== '' && (
                        <div className="detalle-section">
                          <h5>Servicios/Estudios</h5>
                          <div className="servicios-tags">
                            {visita.productos_presentados.split(',').map((servicio, idx) => (
                              <span key={idx} className="servicio-tag">
                                {servicio.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {visita.observaciones && (
                        <div className="detalle-section">
                          <h5>Observaciones</h5>
                          <p className="observaciones">{visita.observaciones}</p>
                        </div>
                      )}

                      {visita.latitud && visita.longitud && (
                        <div className="detalle-section">
                          <h5>Ubicación GPS</h5>
                          <div className="map-container">
                            <MapContainer
                              center={[visita.latitud, visita.longitud]}
                              zoom={15}
                              style={{ height: '200px', width: '100%' }}
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
                        <div className="detalle-section">
                          <h5>Firma del Cliente</h5>
                          <div className="firma-display">
                            <img src={visita.firma_url} alt="Firma" className="firma-imagen" />
                          </div>
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
  )
}

// Agregar estilos para Clock
const Clock = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)