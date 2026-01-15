import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { ChevronDown, ChevronUp, MapPin, Calendar, FileText, Package, Clock } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './ListaVisitas.css'

export default function ListaVisitas() {
  const user = useAuthStore(state => state.user)
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [isListExpanded, setIsListExpanded] = useState(false)

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

  const loadVisitas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setVisitas(data)
    }
    setLoading(false)
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
            {visitas.length} {visitas.length === 1 ? 'visita registrada' : 'visitas registradas'}
          </p>
        </div>
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

      {isListExpanded && (
        <div className="visitas-list">
          {visitas.map((visita) => (
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
      )}
    </div>
  )
}