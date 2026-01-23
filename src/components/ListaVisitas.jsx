import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { ChevronDown, ChevronUp, MapPin, Calendar, FileText, Search, X, ExternalLink } from 'lucide-react'
import './ListaVisitas.css'

export default function ListaVisitas() {
  const user = useAuthStore(state => state.user)
  const [visitas, setVisitas] = useState([])
  const [visitasFiltradas, setVisitasFiltradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  
  // Toggle de vista
  const [vistaHistorial, setVistaHistorial] = useState(false)
  
  // Filtros para historial
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    medico: '',
    municipio: ''
  })

  useEffect(() => {
    loadVisitas()
    
    const handleVisitaRegistrada = () => {
      loadVisitas()
    }
    
    window.addEventListener('visitaRegistrada', handleVisitaRegistrada)
    
    return () => {
      window.removeEventListener('visitaRegistrada', handleVisitaRegistrada)
    }
  }, [user, vistaHistorial])

  useEffect(() => {
    aplicarFiltros()
  }, [visitas, filtros])

  const loadVisitas = async () => {
    setLoading(true)
    
    let query = supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', user.id)
      .order('created_at', { ascending: false })
    
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

  const aplicarFiltros = () => {
    let resultado = [...visitas]

    // Filtro por fecha inicio
    if (filtros.fechaInicio) {
      resultado = resultado.filter(v => 
        new Date(v.created_at).toISOString().split('T')[0] >= filtros.fechaInicio
      )
    }

    // Filtro por fecha fin
    if (filtros.fechaFin) {
      resultado = resultado.filter(v => 
        new Date(v.created_at).toISOString().split('T')[0] <= filtros.fechaFin
      )
    }

    // Filtro por nombre del médico
    if (filtros.medico) {
      resultado = resultado.filter(v => 
        v.nombre_cliente?.toLowerCase().includes(filtros.medico.toLowerCase())
      )
    }

    // Filtro por municipio
    if (filtros.municipio) {
      resultado = resultado.filter(v => 
        v.direccion?.toLowerCase().includes(filtros.municipio.toLowerCase())
      )
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
      fechaInicio: '',
      fechaFin: '',
      medico: '',
      municipio: ''
    })
  }

  const toggleVista = () => {
    setVistaHistorial(!vistaHistorial)
    limpiarFiltros()
  }

  const toggleExpanded = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return <div className="loading">Cargando visitas...</div>
  }

  return (
    <div className="lista-visitas">
      {/* Toggle Vista */}
      <div className="vista-toggle-section">
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${!vistaHistorial ? 'active' : ''}`}
            onClick={() => !vistaHistorial ? null : toggleVista()}
          >
            <Calendar size={16} />
            Solo Hoy
          </button>
          <button
            className={`toggle-btn ${vistaHistorial ? 'active' : ''}`}
            onClick={() => vistaHistorial ? null : toggleVista()}
          >
            <FileText size={16} />
            Historial Completo
          </button>
        </div>
      </div>

      {/* Filtros (solo en historial) */}
      {vistaHistorial && (
        <div className="filtros-avanzados">
          <h4>Filtrar visitas</h4>
          <div className="filtros-grid">
            <div className="filtro-item">
              <label>Desde:</label>
              <input
                type="date"
                name="fechaInicio"
                className="input-small"
                value={filtros.fechaInicio}
                onChange={handleFiltroChange}
              />
            </div>

            <div className="filtro-item">
              <label>Hasta:</label>
              <input
                type="date"
                name="fechaFin"
                className="input-small"
                value={filtros.fechaFin}
                onChange={handleFiltroChange}
              />
            </div>

            <div className="filtro-item">
              <label>Médico:</label>
              <input
                type="text"
                name="medico"
                className="input-small"
                placeholder="Nombre del médico"
                value={filtros.medico}
                onChange={handleFiltroChange}
              />
            </div>

            <div className="filtro-item">
              <label>Municipio:</label>
              <input
                type="text"
                name="municipio"
                className="input-small"
                placeholder="Municipio"
                value={filtros.municipio}
                onChange={handleFiltroChange}
              />
            </div>

            {(filtros.fechaInicio || filtros.fechaFin || filtros.medico || filtros.municipio) && (
              <button onClick={limpiarFiltros} className="btn btn-secondary btn-small">
                <X size={14} />
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Visitas */}
      <div className="visitas-container">
        {visitasFiltradas.length === 0 ? (
          <div className="empty-panel">
            <div className="empty-icon">
              <FileText size={48} />
            </div>
            <div className="empty-content">
              <h3>
                {vistaHistorial 
                  ? 'No se encontraron visitas'
                  : 'No has registrado visitas hoy'
                }
              </h3>
              <p>
                {vistaHistorial
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Las visitas que registres aparecerán aquí'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="visitas-list">
            {visitasFiltradas.map((visita) => (
              <div key={visita.id} className="visita-card">
                <div className="visita-header" onClick={() => toggleExpanded(visita.id)}>
                  <div className="visita-info">
                    <h4>{visita.nombre_cliente}</h4>
                    <div className="visita-meta">
                      <span className="meta-item">
                        <Calendar size={14} />
                        {new Date(visita.created_at).toLocaleDateString('es-GT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="meta-item">
                        <MapPin size={14} />
                        {visita.direccion}
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
                    <div className="detalles-grid">
                      <div className="detalle-section">
                        <h5>Información General</h5>
                        <div className="detalle-item">
                          <span className="detalle-label">Tipo de establecimiento:</span>
                          <span className="detalle-value">{visita.tipo_establecimiento}</span>
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
                          <p className="observaciones-text">{visita.observaciones}</p>
                        </div>
                      )}

                      {visita.latitud && visita.longitud && (
                        <div className="detalle-section">
                          <h5>Ubicación GPS</h5>
                          <div className="ubicacion-gps-simple">
                            <div className="coordenadas-display">
                              <div className="coord-item">
                                <span className="coord-label">Latitud:</span>
                                <span className="coord-value">{visita.latitud.toFixed(6)}</span>
                              </div>
                              <div className="coord-item">
                                <span className="coord-label">Longitud:</span>
                                <span className="coord-value">{visita.longitud.toFixed(6)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const url = `https://www.google.com/maps?q=${visita.latitud},${visita.longitud}`
                                window.open(url, '_blank')
                              }}
                              className="btn-google-maps"
                            >
                              <ExternalLink size={16} />
                              Abrir en Google Maps
                            </button>
                          </div>
                        </div>
                      )}

                      {visita.firma_url && (
                        <div className="detalle-section">
                          <h5>Firma del Cliente</h5>
                          <div className="firma-container">
                            <img src={visita.firma_url} alt="Firma" className="firma-img" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}