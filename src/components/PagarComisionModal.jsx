import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { X, CheckCircle, Edit3 } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import './PagarComisionModal.css'

export default function PagarComisionModal({ comision, onClose, onPagoExitoso }) {
  const user = useAuthStore(state => state.user)
  const [nombreRecibe, setNombreRecibe] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const sigCanvas = useRef(null)

  const limpiarFirma = () => {
    sigCanvas.current?.clear()
  }

  const handlePagar = async () => {
    if (!nombreRecibe.trim()) {
      setError('Por favor ingresa el nombre de quien recibe')
      return
    }

    if (sigCanvas.current?.isEmpty()) {
      setError('Por favor captura la firma de quien recibe')
      return
    }

    setGuardando(true)
    setError('')

    try {
      // 1. Obtener firma como base64
      const firmaDataUrl = sigCanvas.current.toDataURL('image/png')
      
      // 2. Convertir a blob
      const blob = await fetch(firmaDataUrl).then(r => r.blob())
      
      // 3. Subir a Supabase Storage
      const fileName = `firma-comision-${comision.id}-${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firmas')
        .upload(fileName, blob, {
          contentType: 'image/png'
        })

      if (uploadError) throw uploadError

      // 4. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('firmas')
        .getPublicUrl(fileName)

      // 5. Marcar comisión como pagada
      const { data, error: updateError } = await supabase
        .rpc('marcar_comision_mensual_pagada', {
          p_comision_id: comision.id,
          p_visitadora_id: user.id,
          p_firma_url: publicUrl,
          p_nombre_recibe: nombreRecibe
        })

      if (updateError) throw updateError

      alert(`✅ Comisión pagada: ${comision.nombre_medico} - Q${comision.total_comision}`)
      onPagoExitoso()
      
    } catch (error) {
      console.error('Error al pagar comisión:', error)
      setError('Error al procesar el pago: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-pagar-comision">
        <div className="modal-header">
          <h2>Confirmar Pago de Comisión</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Info de la comisión */}
          <div className="comision-info-pago">
            <div className="info-row">
              <span className="info-label">Médico:</span>
              <span className="info-valor"><strong>{comision.nombre_medico}</strong></span>
            </div>
            <div className="info-row">
              <span className="info-label">Mes:</span>
              <span className="info-valor">Diciembre 2024</span>
            </div>
            <div className="info-row destacado">
              <span className="info-label">Total a Pagar:</span>
              <span className="info-valor total">Q{parseFloat(comision.total_comision || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Desglose */}
          <div className="desglose-comision">
            <h4>Desglose:</h4>
            <div className="desglose-item">
              <span>Comisión USG</span>
              <span>Q{parseFloat(comision.comision_usg || 0).toFixed(2)}</span>
            </div>
            <div className="desglose-item">
              <span>Comisión Especial</span>
              <span>Q{parseFloat(comision.comision_especial || 0).toFixed(2)}</span>
            </div>
            <div className="desglose-item">
              <span>Comisión EKG/PAP/LABS</span>
              <span>Q{parseFloat(comision.comision_ekg || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Nombre quien recibe */}
          <div className="form-group">
            <label>Nombre de quien recibe la comisión *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej: Dr. Juan Pérez"
              value={nombreRecibe}
              onChange={(e) => setNombreRecibe(e.target.value)}
            />
          </div>

          {/* Firma */}
          <div className="firma-section">
            <div className="firma-header">
              <label>Firma de quien recibe *</label>
              <button 
                onClick={limpiarFirma}
                className="btn btn-secondary btn-small"
                type="button"
              >
                <Edit3 size={14} />
                Limpiar
              </button>
            </div>
            <div className="firma-canvas-container">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'firma-canvas'
                }}
              />
            </div>
            <p className="firma-hint">Dibuja la firma en el recuadro</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button 
            onClick={handlePagar}
            className="btn btn-success"
            disabled={guardando}
          >
            <CheckCircle size={18} />
            {guardando ? 'Procesando...' : 'Confirmar Pago'}
          </button>
        </div>
      </div>
    </div>
  )
}