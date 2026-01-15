import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { MapPin, CheckCircle, AlertCircle, X } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './RegistrarVisita.css'

// Fix para los iconos de Leaflet
import L from 'leaflet'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function RegistrarVisita({ onClose, onSuccess }) {
  const user = useAuthStore(state => state.user)
  const sigCanvas = useRef(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    direccion: '',
    tipo_establecimiento: '',
    productos_presentados: '',
    observaciones: '',
    latitud: null,
    longitud: null
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const obtenerUbicacion = () => {
    setGpsLoading(true)
    setError('')

    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      setGpsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        })
        setGpsLoading(false)
      },
      (error) => {
        setError('No se pudo obtener la ubicación. Asegúrate de dar permiso.')
        setGpsLoading(false)
      }
    )
  }

  const limpiarFirma = () => {
    sigCanvas.current.clear()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validaciones
    if (!formData.nombre_cliente || !formData.direccion) {
      setError('Por favor completa los campos obligatorios')
      setLoading(false)
      return
    }

    if (!formData.latitud || !formData.longitud) {
      setError('Por favor captura tu ubicación GPS')
      setLoading(false)
      return
    }

    if (sigCanvas.current.isEmpty()) {
      setError('Por favor agrega tu firma')
      setLoading(false)
      return
    }

    try {
      // Convertir firma a imagen
      const firmaDataURL = sigCanvas.current.toDataURL('image/png')
      const firmaBlob = await (await fetch(firmaDataURL)).blob()
      const firmaFileName = `firma_${user.id}_${Date.now()}.png`

      // Subir firma a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('firmas')
        .upload(firmaFileName, firmaBlob)

      if (uploadError) throw uploadError

      // Obtener URL pública de la firma
      const { data: { publicUrl } } = supabase.storage
        .from('firmas')
        .getPublicUrl(firmaFileName)

      // Guardar visita en la base de datos
      const productos = formData.productos_presentados 
        ? formData.productos_presentados.split(',').map(p => p.trim())
        : []

      const { error: insertError } = await supabase
        .from('visitas')
        .insert({
          visitadora_id: user.id,
          nombre_cliente: formData.nombre_cliente,
          direccion: formData.direccion,
          tipo_establecimiento: formData.tipo_establecimiento,
          productos_presentados: productos,
          observaciones: formData.observaciones,
          latitud: formData.latitud,
          longitud: formData.longitud,
          firma_url: publicUrl
        })

      if (insertError) throw insertError

      setSuccess(true)
      
      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        if (onSuccess) onSuccess()
        if (onClose) onClose()
      }, 2000)

    } catch (error) {
      setError(error.message || 'Error al registrar la visita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Registrar Nueva Visita</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="success-message">
            <CheckCircle size={48} color="#10b981" />
            <h3>¡Visita Registrada!</h3>
            <p>La visita se ha guardado correctamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="visita-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre_cliente">
                  Nombre del Cliente <span className="required">*</span>
                </label>
                <input
                  id="nombre_cliente"
                  name="nombre_cliente"
                  type="text"
                  className="input"
                  value={formData.nombre_cliente}
                  onChange={handleChange}
                  placeholder="Ej: Dr. Juan Pérez"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tipo_establecimiento">Tipo de Establecimiento</label>
                <select
                  id="tipo_establecimiento"
                  name="tipo_establecimiento"
                  className="input"
                  value={formData.tipo_establecimiento}
                  onChange={handleChange}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Hospital">Hospital</option>
                  <option value="Clínica">Clínica</option>
                  <option value="Centro de Diagnóstico">Centro de Diagnóstico</option>
                  <option value="Laboratorio">Laboratorio</option>
                  <option value="Consultorio Médico">Consultorio Médico</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="direccion">
                Dirección <span className="required">*</span>
              </label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                className="input"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Dirección completa"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="productos_presentados">
                Servicios/Estudios Presentados
              </label>
              <input
                id="productos_presentados"
                name="productos_presentados"
                type="text"
                className="input"
                value={formData.productos_presentados}
                onChange={handleChange}
                placeholder="Ej: Rayos X, Tomografía, Ultrasonido"
              />
              <small>Separa los servicios con comas</small>
            </div>

            <div className="form-group">
              <label htmlFor="observaciones">Observaciones</label>
              <textarea
                id="observaciones"
                name="observaciones"
                className="input"
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                placeholder="Notas adicionales sobre la visita..."
              />
            </div>

            {/* GPS y Mapa */}
            <div className="form-group">
              <label>
                Ubicación GPS <span className="required">*</span>
              </label>
              <button
                type="button"
                onClick={obtenerUbicacion}
                className="btn btn-secondary"
                disabled={gpsLoading}
              >
                <MapPin size={16} />
                {gpsLoading ? 'Obteniendo ubicación...' : 'Capturar Ubicación'}
              </button>

              {formData.latitud && formData.longitud && (
                <div className="gps-info">
                  <div className="coordinates">
                    <p>
                      <strong>Latitud:</strong> {formData.latitud.toFixed(6)}
                    </p>
                    <p>
                      <strong>Longitud:</strong> {formData.longitud.toFixed(6)}
                    </p>
                  </div>
                  
                  <div className="map-container">
                    <MapContainer
                      center={[formData.latitud, formData.longitud]}
                      zoom={15}
                      style={{ height: '250px', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Marker position={[formData.latitud, formData.longitud]}>
                        <Popup>Tu ubicación actual</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Firma Digital */}
            <div className="form-group">
              <label>
                Firma Digital <span className="required">*</span>
              </label>
              <div className="signature-container">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: 'signature-canvas'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={limpiarFirma}
                className="btn btn-secondary btn-small"
              >
                Limpiar Firma
              </button>
            </div>

            {error && (
              <div className="error-box">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Registrar Visita'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}