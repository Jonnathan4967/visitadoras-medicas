import { useRef, useState, useEffect } from 'react'
import { X, Edit3, CheckCircle } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import './FirmaModal.css'

export default function FirmaModal({ isOpen, onClose, onSave, titulo = "Capturar Firma" }) {
  const sigCanvas = useRef(null)
  const [firmaGuardada, setFirmaGuardada] = useState(null)

  useEffect(() => {
    // Prevenir scroll cuando el modal está abierto
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const limpiarFirma = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear()
      setFirmaGuardada(null)
    }
  }

  const guardarFirma = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const firmaDataUrl = sigCanvas.current.toDataURL('image/png')
      setFirmaGuardada(firmaDataUrl)
      onSave(firmaDataUrl)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="firma-modal-overlay" onClick={onClose}>
      <div className="firma-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="firma-modal-header">
          <h2>{titulo}</h2>
          <button onClick={onClose} className="btn-close-firma">
            <X size={24} />
          </button>
        </div>

        <div className="firma-modal-body">
          <div className="firma-instrucciones">
            <p>✍️ Dibuja la firma con tu dedo o stylus en el recuadro blanco</p>
          </div>

          <div className="firma-canvas-wrapper">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'firma-canvas-modal'
              }}
            />
          </div>

          <div className="firma-modal-actions">
            <button
              type="button"
              onClick={limpiarFirma}
              className="btn btn-secondary"
            >
              <Edit3 size={18} />
              Limpiar
            </button>
            <button
              type="button"
              onClick={guardarFirma}
              className="btn btn-success"
            >
              <CheckCircle size={18} />
              Guardar Firma
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
