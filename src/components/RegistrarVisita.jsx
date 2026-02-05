import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { MapPin, CheckCircle, AlertCircle, X, Search, Edit3, ChevronDown, ChevronUp, Navigation, ExternalLink } from 'lucide-react'
import FirmaModal from './FirmaModal'
import './RegistrarVisita.css'

export default function RegistrarVisita({ onClose, onSuccess }) {
  const user = useAuthStore(state => state.user)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [firmaDataUrl, setFirmaDataUrl] = useState(null)
  const [showUbicacion, setShowUbicacion] = useState(false)
  const [capturandoGPS, setCapturandoGPS] = useState(false)
  
  // Búsqueda de médicos
  const [busqueda, setBusqueda] = useState('')
  const [medicosFiltrados, setMedicosFiltrados] = useState([])
  const [medicoSeleccionado, setMedicoSeleccionado] = useState(null)
  const [mostrarResultados, setMostrarResultados] = useState(false)
  
  const [formData, setFormData] = useState({
    observaciones: '',
    latitud: null,
    longitud: null
  })

  // Buscar médicos
  const buscarMedicos = async (termino) => {
    setBusqueda(termino)
    
    if (termino.length < 2) {
      setMedicosFiltrados([])
      setMostrarResultados(false)
      return
    }

    const { data } = await supabase
      .rpc('buscar_medicos', { termino })

    if (data) {
      setMedicosFiltrados(data)
      setMostrarResultados(true)
    }
  }

  const seleccionarMedico = (medico) => {
    setMedicoSeleccionado(medico)
    setBusqueda(medico.nombre)
    setMostrarResultados(false)
  }

  const obtenerUbicacion = () => {
    setCapturandoGPS(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setCapturandoGPS(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        })
        setCapturandoGPS(false)
      },
      (error) => {
        setError('Error al obtener ubicación: ' + error.message)
        setCapturandoGPS(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const limpiarUbicacion = () => {
    setFormData({
      ...formData,
      latitud: null,
      longitud: null
    })
  }

  const abrirEnGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`
    window.open(url, '_blank')
  }

  const limpiarFirma = () => {
    setFirmaDataUrl(null)
  }

  const handleSaveFirma = (dataUrl) => {
    setFirmaDataUrl(dataUrl)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validaciones
    if (!medicoSeleccionado) {
      setError('Debes seleccionar un médico')
      setLoading(false)
      return
    }

    if (!formData.latitud || !formData.longitud) {
      setError('Debes capturar tu ubicación GPS')
      setLoading(false)
      return
    }

    if (!firmaDataUrl) {
      setError('Debes obtener la firma del cliente')
      setLoading(false)
      return
    }

    try {
      // Subir firma a Supabase Storage
      const fileName = `firma_${user.id}_${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firmas')
        .upload(fileName, dataURLtoBlob(firmaDataUrl), {
          contentType: 'image/png'
        })

      if (uploadError) throw uploadError

      // Obtener URL pública de la firma
      const { data: { publicUrl } } = supabase.storage
        .from('firmas')
        .getPublicUrl(fileName)

      // Insertar visita en la base de datos
      const { error: insertError } = await supabase
        .from('visitas')
        .insert([{
          visitadora_id: user.id,
          medico_id: medicoSeleccionado.id,
          nombre_cliente: medicoSeleccionado.nombre,
          direccion: medicoSeleccionado.direccion || 'Sin dirección',
          tipo_establecimiento: medicoSeleccionado.clinica || 'Sin especificar',
          observaciones: formData.observaciones,
          latitud: formData.latitud,
          longitud: formData.longitud,
          firma_url: publicUrl
        }])

      if (insertError) throw insertError

      setSuccess(true)
      
      // Disparar evento para actualizar lista
      window.dispatchEvent(new Event('visitaRegistrada'))
      
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)

    } catch (error) {
      setError('Error al registrar visita: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Función auxiliar para convertir base64 a Blob
  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-registrar-visita">
        <div className="modal-header">
          <h2>Registrar Visita</h2>
          <button onClick={onClose} className="btn-close">
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="success-container">
            <CheckCircle size={64} color="#10b981" />
            <h3>¡Visita registrada exitosamente!</h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="visita-form">
            {/* Búsqueda de Médico */}
            <div className="form-section">
              <h3>
                <Search size={20} />
                Buscar Médico
              </h3>
              
              <div className="search-medico-container">
                <input
                  type="text"
                  className="input"
                  placeholder="Buscar médico por nombre, clínica o municipio..."
                  value={busqueda}
                  onChange={(e) => buscarMedicos(e.target.value)}
                  required
                />

                {mostrarResultados && medicosFiltrados.length > 0 && (
                  <div className="search-results">
                    {medicosFiltrados.map((medico) => (
                      <div
                        key={medico.id}
                        className="search-result-item"
                        onClick={() => seleccionarMedico(medico)}
                      >
                        <div>
                          <strong>{medico.nombre}</strong>
                          {medico.clinica && <p className="result-subtitle">{medico.clinica}</p>}
                          {medico.municipio && <p className="result-subtitle">{medico.municipio}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {medicoSeleccionado && (
                  <div className="medico-seleccionado">
                    <div className="medico-info">
                      <h4>{medicoSeleccionado.nombre}</h4>
                      {medicoSeleccionado.clinica && <p>📍 {medicoSeleccionado.clinica}</p>}
                      {medicoSeleccionado.especialidad && <p>🩺 {medicoSeleccionado.especialidad}</p>}
                      {medicoSeleccionado.municipio && <p>📌 {medicoSeleccionado.municipio}</p>}
                      {medicoSeleccionado.telefono && <p>📞 {medicoSeleccionado.telefono}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMedicoSeleccionado(null)
                        setBusqueda('')
                      }}
                      className="btn-cambiar"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ubicación GPS - Desplegable */}
            <div className="form-section ubicacion-visita-section">
              <button
                type="button"
                className="ubicacion-visita-toggle"
                onClick={() => setShowUbicacion(!showUbicacion)}
              >
                <MapPin size={20} />
                <span>Ubicación GPS</span>
                {showUbicacion ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>

              {showUbicacion && (
                <div className="ubicacion-visita-content">
                  <p className="ubicacion-visita-hint">
                    📍 Captura tu ubicación actual en la visita
                  </p>

                  {formData.latitud && formData.longitud ? (
                    <div className="ubicacion-visita-preview">
                      <div className="ubicacion-capturada">
                        <CheckCircle size={20} color="#10b981" />
                        <span>Ubicación capturada</span>
                      </div>
                      <div className="coordenadas-visita">
                        <div className="coord-visita-item">
                          <span className="coord-visita-label">Latitud:</span>
                          <span className="coord-visita-value">{formData.latitud.toFixed(6)}</span>
                        </div>
                        <div className="coord-visita-item">
                          <span className="coord-visita-label">Longitud:</span>
                          <span className="coord-visita-value">{formData.longitud.toFixed(6)}</span>
                        </div>
                      </div>
                      <div className="ubicacion-visita-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => abrirEnGoogleMaps(formData.latitud, formData.longitud)}
                        >
                          <ExternalLink size={16} />
                          Ver en Mapa
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={limpiarUbicacion}
                        >
                          <X size={16} />
                          Limpiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-capturar"
                      onClick={obtenerUbicacion}
                      disabled={capturandoGPS}
                    >
                      <Navigation size={18} />
                      {capturandoGPS ? 'Obteniendo ubicación...' : 'Capturar Mi Ubicación'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Observaciones */}
            <div className="form-section">
              <label>Observaciones (opcional)</label>
              <textarea
                name="observaciones"
                className="input"
                rows="3"
                placeholder="Notas adicionales sobre la visita..."
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </div>

            {/* Firma */}
            <div className="form-section">
              <h3>Firma del Cliente</h3>
              
              {firmaDataUrl ? (
                <div className="firma-preview-container">
                  <img src={firmaDataUrl} alt="Firma" className="firma-preview" />
                  <div className="firma-actions">
                    <button
                      type="button"
                      onClick={() => setShowFirmaModal(true)}
                      className="btn btn-secondary btn-small"
                    >
                      <Edit3 size={16} />
                      Editar Firma
                    </button>
                    <button
                      type="button"
                      onClick={limpiarFirma}
                      className="btn btn-secondary btn-small"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFirmaModal(true)}
                  className="btn btn-primary"
                >
                  <Edit3 size={18} />
                  Capturar Firma
                </button>
              )}
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Registrando...' : 'Registrar Visita'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Modal de Firma */}
      <FirmaModal
        isOpen={showFirmaModal}
        onClose={() => setShowFirmaModal(false)}
        onSave={handleSaveFirma}
        titulo="Firma del Cliente"
      />
    </div>
  )
}