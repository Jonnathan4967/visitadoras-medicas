import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, CheckCircle, Calendar, Search } from 'lucide-react'
import PagarComisionModal from './PagarComisionModal'
import './ComisionesMensuales.css'

export default function ComisionesMensualesVisitadora() {
  const [comisionesPendientes, setComisionesPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPagarModal, setShowPagarModal] = useState(false)
  const [comisionSeleccionada, setComisionSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    loadComisionesPendientes()
  }, [])

  const loadComisionesPendientes = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('comisiones_mensuales')
      .select('*')
      .eq('estado', 'pendiente')
      .order('total_comision', { ascending: false })

    if (data) {
      setComisionesPendientes(data)
    }
    
    setLoading(false)
  }

  const handlePagar = (comision) => {
    setComisionSeleccionada(comision)
    setShowPagarModal(true)
  }

  const handlePagoExitoso = () => {
    setShowPagarModal(false)
    setComisionSeleccionada(null)
    loadComisionesPendientes() // Recargar lista
  }

  const totalPendiente = comisionesPendientes.reduce((sum, c) => 
    sum + parseFloat(c.total_comision || 0), 0
  )

  // Filtrar por búsqueda
  const comisionesFiltradas = comisionesPendientes.filter(c => {
    if (!busqueda.trim()) return true
    const termino = busqueda.toLowerCase()
    return c.nombre_medico?.toLowerCase().includes(termino)
  })

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando comisiones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="comisiones-mensuales-visitadora">
      {/* Header con Stats */}
      <div className="comisiones-header">
        <div className="header-info">
          <Calendar size={20} />
          <div>
            <h3>Comisiones del Mes</h3>
            <p>Diciembre 2024</p>
          </div>
        </div>
        <div className="header-total">
          <span className="total-label">Total Pendiente:</span>
          <span className="total-value">Q{totalPendiente.toFixed(2)}</span>
        </div>
      </div>

      {/* Buscador */}
      <div className="search-section-comisiones">
        <div className="search-container-comisiones">
          <Search size={20} />
          <input
            type="text"
            className="search-input-comisiones"
            placeholder="Buscar médico..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Comisiones */}
      <div className="comisiones-grid">
        {comisionesFiltradas.length === 0 ? (
          <div className="empty-comisiones">
            {busqueda ? (
              <>
                <Search size={64} color="#9ca3af" />
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otro término de búsqueda</p>
              </>
            ) : (
              <>
                <CheckCircle size={64} color="#10b981" />
                <h3>¡Todo Pagado!</h3>
                <p>No hay comisiones pendientes por pagar este mes</p>
              </>
            )}
          </div>
        ) : (
          comisionesFiltradas.map((comision) => (
            <div key={comision.id} className="comision-card">
              <div className="comision-header">
                <div className="comision-icon">
                  <DollarSign size={24} />
                </div>
                <div className="comision-info">
                  <h4>{comision.nombre_medico}</h4>
                  <span className="comision-mes">Diciembre 2024</span>
                </div>
              </div>

              <div className="comision-detalles">
                <div className="detalle-row">
                  <span className="detalle-label">Comisión USG:</span>
                  <span className="detalle-valor">Q{parseFloat(comision.comision_usg || 0).toFixed(2)}</span>
                </div>
                <div className="detalle-row">
                  <span className="detalle-label">Comisión Especial:</span>
                  <span className="detalle-valor">Q{parseFloat(comision.comision_especial || 0).toFixed(2)}</span>
                </div>
                <div className="detalle-row">
                  <span className="detalle-label">Comisión EKG/PAP/LABS:</span>
                  <span className="detalle-valor">Q{parseFloat(comision.comision_ekg || 0).toFixed(2)}</span>
                </div>
                <div className="detalle-row total-row">
                  <span className="detalle-label"><strong>TOTAL A PAGAR:</strong></span>
                  <span className="detalle-valor total">
                    Q{parseFloat(comision.total_comision || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => handlePagar(comision)}
                className="btn btn-success btn-full"
              >
                <CheckCircle size={18} />
                Marcar como Pagado
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal Pagar */}
      {showPagarModal && comisionSeleccionada && (
        <PagarComisionModal
          comision={comisionSeleccionada}
          onClose={() => setShowPagarModal(false)}
          onPagoExitoso={handlePagoExitoso}
        />
      )}
    </div>
  )
}