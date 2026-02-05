import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { X, CheckCircle, Edit3 } from 'lucide-react'
import FirmaModal from './FirmaModal'
import './PagarComisionModal.css'

export default function PagarComisionModal({ comision, onClose, onPagoExitoso }) {
  const user = useAuthStore(state => state.user)
  const [nombreRecibe, setNombreRecibe] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [firmaDataUrl, setFirmaDataUrl] = useState(null)

  const limpiarFirma = () => {
    setFirmaDataUrl(null)
  }

  const handleSaveFirma = (dataUrl) => {
    setFirmaDataUrl(dataUrl)
  }

  const handlePagar = async () => {
    if (!nombreRecibe.trim()) {
      setError('Por favor ingresa el nombre de quien recibe')
      return
    }

    if (!firmaDataUrl) {
      setError('Por favor captura la firma de quien recibe')
      return
    }

    setGuardando(true)
    setError('')

    try {
      // 1. Convertir a blob
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

      // 5. Actualizar comision_mensual como pagada
      const { error: updateError } = await supabase
        .from('comisiones_mensuales')
        .update({
          estado: 'pagado',
          fecha_pago: new Date().toISOString(),
          nombre_recibe: nombreRecibe,
          firma_url: publicUrl,
          visitadora_pagadora_id: user.id
        })
        .eq('id', comision.id)

      if (updateError) throw updateError

      // 6. Registrar en pagos_comisiones
      const mesActual = new Date().getMonth() + 1
      const anioActual = new Date().getFullYear()

      const { error: insertError } = await supabase
        .from('pagos_comisiones')
        .insert({
          visitadora_id: user.id,
          medico_nombre: comision.nombre_medico,
          monto: parseFloat(comision.total_comision),
          mes: mesActual,
          anio: anioActual,
          fecha_pago: new Date().toISOString(),
          firma_url: publicUrl,
          nombre_recibe: nombreRecibe
        })

      if (insertError) throw insertError

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
            <label>Firma de quien recibe *</label>
            
            {firmaDataUrl ? (
              <div className="firma-preview-wrapper">
                <img src={firmaDataUrl} alt="Firma" className="firma-preview-img" />
                <div className="firma-preview-actions">
                  <button 
                    onClick={() => setShowFirmaModal(true)}
                    className="btn btn-secondary btn-small"
                    type="button"
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>
                  <button 
                    onClick={limpiarFirma}
                    className="btn btn-secondary btn-small"
                    type="button"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowFirmaModal(true)}
                className="btn btn-primary"
                type="button"
              >
                <Edit3 size={16} />
                Capturar Firma
              </button>
            )}
            
            <p className="firma-hint">La firma confirma el recibo de la comisión</p>
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

      {/* Modal de Firma */}
      <FirmaModal
        isOpen={showFirmaModal}
        onClose={() => setShowFirmaModal(false)}
        onSave={handleSaveFirma}
        titulo="Firma de quien recibe"
      />
    </div>
  )
}