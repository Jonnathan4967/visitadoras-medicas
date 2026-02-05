import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { DollarSign, Clock, CheckCircle, X, Eye } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import './ComisionesVisitadora.css'

export default function ComisionesVisitadora() {
  const user = useAuthStore(state => state.user)
  const sigCanvas = useRef(null)
  
  const [misAsignadas, setMisAsignadas] = useState([])
  const [poolGeneral, setPoolGeneral] = useState([])
  const [historialPagadas, setHistorialPagadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('asignadas')
  
  // Modal de pago
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [comisionSeleccionada, setComisionSeleccionada] = useState(null)
  const [nombreRecibe, setNombreRecibe] = useState('')
  const [pagando, setPagando] = useState(false)
  
  // Modal de ver firma
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [firmaUrl, setFirmaUrl] = useState('')

  useEffect(() => {
    loadComisiones()
  }, [])

  const loadComisiones = async () => {
    setLoading(true)
    
    // Mis asignadas
    const { data: asignadas } = await supabase
      .from('vista_comisiones_medicos')
      .select('*')
      .eq('asignada_a_id', user.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true })
    
    // Pool general (sin asignar)
    const { data: pool } = await supabase
      .from('vista_comisiones_medicos')
      .select('*')
      .is('asignada_a_id', null)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true })
    
    // Historial (pagadas por mí)
    const { data: pagadas } = await supabase
      .from('vista_comisiones_medicos')
      .select('*')
      .eq('pagado_por_id', user.id)
      .eq('estado', 'pagado')
      .order('fecha_hora_pago', { ascending: false })
      .limit(20)
    
    setMisAsignadas(asignadas || [])
    setPoolGeneral(pool || [])
    setHistorialPagadas(pagadas || [])
    setLoading(false)
  }

  const abrirModalPago = (comision) => {
    setComisionSeleccionada(comision)
    setNombreRecibe('')
    setShowPagoModal(true)
  }

  const limpiarFirma = () => {
    sigCanvas.current.clear()
  }

  const handlePagar = async () => {
    if (sigCanvas.current.isEmpty()) {
      alert('⚠️ Debes capturar la firma de recibido')
      return
    }

    setPagando(true)

    try {
      // Convertir firma a base64
      const firmaBase64 = sigCanvas.current.toDataURL('image/png')
      
      // Subir firma a Supabase Storage
      const fileName = `firma_recibido_${comisionSeleccionada.id}_${Date.now()}.png`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firmas')
        .upload(fileName, dataURLtoBlob(firmaBase64), {
          contentType: 'image/png'
        })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('firmas')
        .getPublicUrl(fileName)

      // Marcar como pagado usando la función
      const { error: pagoError } = await supabase
        .rpc('marcar_comision_pagada', {
          p_comision_id: comisionSeleccionada.id,
          p_firma_url: publicUrl,
          p_nombre_recibe: nombreRecibe || null
        })

      if (pagoError) throw pagoError

      alert('✅ Comisión marcada como pagada')
      setShowPagoModal(false)
      loadComisiones()
      
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al procesar el pago: ' + error.message)
    } finally {
      setPagando(false)
    }
  }

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

  const verFirma = (url) => {
    setFirmaUrl(url)
    setShowFirmaModal(true)
  }

  const formatMonto = (monto) => {
    return `Q${parseFloat(monto).toFixed(2)}`
  }

  const calcularTotales = () => {
    const asignadasTotal = misAsignadas.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
    const poolTotal = poolGeneral.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
    const pagadasTotal = historialPagadas.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)

    return { asignadasTotal, poolTotal, pagadasTotal }
  }

  const totales = calcularTotales()

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="comisiones-visitadora">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Comisiones a Pagar</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Gestión de pagos a médicos
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card stat-asignadas">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div>
              <p className="stat-label">Mis Asignadas</p>
              <p className="stat-value">{formatMonto(totales.asignadasTotal)}</p>
              <p className="stat-count">{misAsignadas.length} comisiones</p>
            </div>
          </div>

          <div className="stat-card stat-pool">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="stat-label">Disponibles</p>
              <p className="stat-value">{formatMonto(totales.poolTotal)}</p>
              <p className="stat-count">{poolGeneral.length} comisiones</p>
            </div>
          </div>

          <div className="stat-card stat-pagadas">
            <div className="stat-icon">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="stat-label">Pagadas por Mí</p>
              <p className="stat-value">{formatMonto(totales.pagadasTotal)}</p>
              <p className="stat-count">{historialPagadas.length} comisiones</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-comisiones">
          <button
            className={`tab-comision ${activeTab === 'asignadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('asignadas')}
          >
            Mis Asignadas ({misAsignadas.length})
          </button>
          <button
            className={`tab-comision ${activeTab === 'pool' ? 'active' : ''}`}
            onClick={() => setActiveTab('pool')}
          >
            Disponibles ({poolGeneral.length})
          </button>
          <button
            className={`tab-comision ${activeTab === 'pagadas' ? 'active' : ''}`}
            onClick={() => setActiveTab('pagadas')}
          >
            Pagadas ({historialPagadas.length})
          </button>
        </div>

        {/* Contenido */}
        <div className="tab-content-comisiones">
          {activeTab === 'asignadas' && (
            <ComisionesLista 
              comisiones={misAsignadas}
              onPagar={abrirModalPago}
              empty="No tienes comisiones asignadas"
            />
          )}

          {activeTab === 'pool' && (
            <ComisionesLista 
              comisiones={poolGeneral}
              onPagar={abrirModalPago}
              empty="No hay comisiones disponibles"
            />
          )}

          {activeTab === 'pagadas' && (
            <ComisionesPagadas 
              comisiones={historialPagadas}
              onVerFirma={verFirma}
              empty="No has pagado comisiones aún"
            />
          )}
        </div>
      </div>

      {/* Modal Pagar */}
      {showPagoModal && comisionSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-content modal-pago">
            <div className="modal-header">
              <h2>Confirmar Pago</h2>
              <button onClick={() => setShowPagoModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div className="pago-content">
              {/* Resumen */}
              <div className="resumen-pago">
                <div className="resumen-item">
                  <span className="label">Médico:</span>
                  <span className="value">{comisionSeleccionada.medico_nombre}</span>
                </div>
                {comisionSeleccionada.clinica && (
                  <div className="resumen-item">
                    <span className="label">Clínica:</span>
                    <span className="value">{comisionSeleccionada.clinica}</span>
                  </div>
                )}
                <div className="resumen-item">
                  <span className="label">Paciente:</span>
                  <span className="value">{comisionSeleccionada.paciente_nombre}</span>
                </div>
                <div className="resumen-item">
                  <span className="label">Estudio:</span>
                  <span className="value">{comisionSeleccionada.estudio_realizado}</span>
                </div>
                <div className="resumen-item monto-destacado">
                  <span className="label">Monto a Pagar:</span>
                  <span className="value">{formatMonto(comisionSeleccionada.monto_comision)}</span>
                </div>
              </div>

              {/* Nombre opcional */}
              <div className="form-group">
                <label>Nombre de quien recibe (opcional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Secretaria María López"
                  value={nombreRecibe}
                  onChange={(e) => setNombreRecibe(e.target.value)}
                />
              </div>

              {/* Firma */}
              <div className="firma-section">
                <label>Firma de Recibido *</label>
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

              {/* Acciones */}
              <div className="form-actions">
                <button
                  onClick={() => setShowPagoModal(false)}
                  className="btn btn-secondary"
                  disabled={pagando}
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePagar}
                  className="btn btn-success"
                  disabled={pagando}
                >
                  {pagando ? 'Procesando...' : '✅ Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Firma */}
      {showFirmaModal && (
        <div className="modal-overlay" onClick={() => setShowFirmaModal(false)}>
          <div className="modal-content modal-firma" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Firma de Recibido</h2>
              <button onClick={() => setShowFirmaModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>
            <div className="firma-display-large">
              <img src={firmaUrl} alt="Firma de recibido" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente auxiliar: Lista de comisiones pendientes
function ComisionesLista({ comisiones, onPagar, empty }) {
  if (comisiones.length === 0) {
    return (
      <div className="empty-state">
        <DollarSign size={48} color="#9ca3af" />
        <p>{empty}</p>
      </div>
    )
  }

  return (
    <div className="comisiones-list">
      {comisiones.map((comision) => (
        <div key={comision.id} className="comision-card">
          <div className="comision-info">
            <h4>{comision.medico_nombre}</h4>
            {comision.clinica && <p className="subtitle">{comision.clinica}</p>}
            {comision.municipio && <p className="subtitle">📍 {comision.municipio}</p>}
            <div className="comision-detalles">
              <span>Paciente: {comision.paciente_nombre}</span>
              <span>Estudio: {comision.estudio_realizado}</span>
            </div>
          </div>
          <div className="comision-actions">
            <div className="monto">Q{parseFloat(comision.monto_comision).toFixed(2)}</div>
            <button
              onClick={() => onPagar(comision)}
              className="btn btn-success btn-small"
            >
              Pagar Ahora
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Componente auxiliar: Lista de comisiones pagadas
function ComisionesPagadas({ comisiones, onVerFirma, empty }) {
  if (comisiones.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle size={48} color="#9ca3af" />
        <p>{empty}</p>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table className="comisiones-table">
        <thead>
          <tr>
            <th>Fecha Pago</th>
            <th>Médico</th>
            <th>Paciente</th>
            <th>Monto</th>
            <th>Recibido por</th>
            <th>Firma</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map((comision) => (
            <tr key={comision.id}>
              <td>
                {new Date(comision.fecha_hora_pago).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td>
                <strong>{comision.medico_nombre}</strong>
                {comision.clinica && <div className="subtitle">{comision.clinica}</div>}
              </td>
              <td>{comision.paciente_nombre}</td>
              <td><strong>Q{parseFloat(comision.monto_comision).toFixed(2)}</strong></td>
              <td>{comision.nombre_quien_recibe || '-'}</td>
              <td>
                <button
                  onClick={() => onVerFirma(comision.firma_recibido_url)}
                  className="btn btn-secondary btn-small"
                >
                  <Eye size={14} />
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}