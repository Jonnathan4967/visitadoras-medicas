import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { DollarSign, CheckCircle, Calendar, Search, Clock, TrendingUp, Settings, Trash2 } from 'lucide-react'
import PagarComisionModal from './PagarComisionModal'
import ConfigurarComisionesMedicoModal from './ConfigurarComisionesMedicoModal'
import ModalSeleccionarMedico from './ModalSeleccionarMedico'
import './ComisionesMensuales.css'

export default function ComisionesMensualesVisitadora() {
  const { user } = useAuthStore()
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPagarModal, setShowPagarModal] = useState(false)
  const [comisionSeleccionada, setComisionSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todas') // todas, pendientes, pagadas
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [medicoParaConfigurar, setMedicoParaConfigurar] = useState(null)
  const [medicos, setMedicos] = useState([])
  const [stats, setStats] = useState({
    totalPendiente: 0,
    totalPagado: 0,
    cantidadPendiente: 0,
    cantidadPagada: 0
  })

  useEffect(() => {
    loadComisiones()
    loadMedicos()
  }, [user])

  useEffect(() => {
    calcularStats()
  }, [comisiones])

  const loadComisiones = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('comisiones_mensuales')
      .select('*')
      .order('estado', { ascending: true })
      .order('total_comision', { ascending: false })

    if (data) {
      setComisiones(data)
    }
    
    setLoading(false)
  }

  const loadMedicos = async () => {
    const { data } = await supabase
      .from('medicos')
      .select('id, nombre, clinica')
      .eq('activo', true)
      .order('nombre')

    if (data) {
      setMedicos(data)
    }
  }

  const calcularStats = () => {
    const pendientes = comisiones.filter(c => c.estado === 'pendiente')
    const pagadas = comisiones.filter(c => c.estado === 'pagado')

    setStats({
      totalPendiente: pendientes.reduce((sum, c) => sum + parseFloat(c.total_comision || 0), 0),
      totalPagado: pagadas.reduce((sum, c) => sum + parseFloat(c.total_comision || 0), 0),
      cantidadPendiente: pendientes.length,
      cantidadPagada: pagadas.length
    })
  }

  const handlePagar = (comision) => {
    setComisionSeleccionada(comision)
    setShowPagarModal(true)
  }

  const handlePagoExitoso = () => {
    setShowPagarModal(false)
    setComisionSeleccionada(null)
    loadComisiones()
  }

  const handleEliminarComision = async (comision) => {
    if (!confirm(`¿Estás seguro de eliminar la comisión de ${comision.nombre_medico}?\n\nMonto: Q${parseFloat(comision.total_comision).toFixed(2)}\n\nEsta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('comisiones_mensuales')
        .delete()
        .eq('id', comision.id)

      if (error) throw error

      alert('✅ Comisión eliminada correctamente')
      loadComisiones()
    } catch (error) {
      console.error('Error al eliminar:', error)
      alert('❌ Error al eliminar la comisión: ' + error.message)
    }
  }

  // Filtrar comisiones
  const comisionesFiltradas = comisiones.filter(c => {
    // Filtro por estado
    let pasaFiltroEstado = true
    if (filtro === 'pendientes') pasaFiltroEstado = c.estado === 'pendiente'
    if (filtro === 'pagadas') pasaFiltroEstado = c.estado === 'pagado'
    
    // Filtro por búsqueda
    let pasaBusqueda = true
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      pasaBusqueda = c.nombre_medico?.toLowerCase().includes(termino)
    }
    
    return pasaFiltroEstado && pasaBusqueda
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
      {/* Stats Cards */}
      <div className="stats-grid-comisiones">
        <div className="stat-card-comision pendiente">
          <div className="stat-icon-comision">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pendiente de Pago</span>
            <span className="stat-value">Q{stats.totalPendiente.toFixed(2)}</span>
            <span className="stat-subtitle">{stats.cantidadPendiente} médicos</span>
          </div>
        </div>

        <div className="stat-card-comision pagado">
          <div className="stat-icon-comision">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pagado</span>
            <span className="stat-value">Q{stats.totalPagado.toFixed(2)}</span>
            <span className="stat-subtitle">{stats.cantidadPagada} médicos</span>
          </div>
        </div>

        <div className="stat-card-comision total">
          <div className="stat-icon-comision">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total del Mes</span>
            <span className="stat-value">Q{(stats.totalPendiente + stats.totalPagado).toFixed(2)}</span>
            <span className="stat-subtitle">{comisiones.length} registros</span>
          </div>
        </div>
      </div>

      {/* Card Principal */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Comisiones del Mes</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Diciembre 2024
            </p>
          </div>
          <button 
            onClick={() => setShowConfigModal(true)}
            className="btn btn-secondary"
          >
            <Settings size={18} />
            Configurar Comisiones
          </button>
        </div>

        {/* Filtros */}
        <div className="filtros-comisiones">
          <button
            className={`filtro-btn ${filtro === 'todas' ? 'active' : ''}`}
            onClick={() => setFiltro('todas')}
          >
            Todas ({comisiones.length})
          </button>
          <button
            className={`filtro-btn ${filtro === 'pendientes' ? 'active' : ''}`}
            onClick={() => setFiltro('pendientes')}
          >
            <Clock size={16} />
            Pendientes ({stats.cantidadPendiente})
          </button>
          <button
            className={`filtro-btn ${filtro === 'pagadas' ? 'active' : ''}`}
            onClick={() => setFiltro('pagadas')}
          >
            <CheckCircle size={16} />
            Pagadas ({stats.cantidadPagada})
          </button>
        </div>

        {/* Buscador */}
        <div className="search-section-comisiones">
          <div className="search-container-comisiones">
            <Search size={20} className="search-icon-comisiones" />
            <input
              type="text"
              className="search-input-comisiones"
              placeholder="Buscar por médico..."
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
              ) : filtro === 'pendientes' ? (
                <>
                  <CheckCircle size={64} color="#10b981" />
                  <h3>¡Todo Pagado!</h3>
                  <p>No hay comisiones pendientes por pagar este mes</p>
                </>
              ) : (
                <>
                  <DollarSign size={64} color="#9ca3af" />
                  <h3>No hay comisiones</h3>
                  <p>No se encontraron comisiones con este filtro</p>
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
                  {comision.estado === 'pagado' && (
                    <span className="badge-estado-small pagado">
                      <CheckCircle size={14} />
                      Pagado
                    </span>
                  )}
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

                {/* Botón solo si está pendiente */}
                {comision.estado === 'pendiente' && (
                  <div className="comision-acciones">
                    <button 
                      onClick={() => handleEliminarComision(comision)}
                      className="btn btn-danger btn-icon"
                      title="Eliminar comisión"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={() => handlePagar(comision)}
                      className="btn btn-success btn-flex-grow"
                    >
                      <CheckCircle size={18} />
                      Marcar como Pagado
                    </button>
                  </div>
                )}

                {/* Info de pago si está pagado */}
                {comision.estado === 'pagado' && comision.fecha_pago && (
                  <div className="pago-info-footer">
                    <Calendar size={14} />
                    <span>
                      Pagado el {new Date(comision.fecha_pago).toLocaleDateString('es-GT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Pagar */}
      {showPagarModal && comisionSeleccionada && (
        <PagarComisionModal
          comision={comisionSeleccionada}
          onClose={() => setShowPagarModal(false)}
          onPagoExitoso={handlePagoExitoso}
        />
      )}

      {/* Modal Selector de Médico */}
      {showConfigModal && !medicoParaConfigurar && (
        <ModalSeleccionarMedico
          medicos={medicos}
          onClose={() => setShowConfigModal(false)}
          onSelect={(medico) => setMedicoParaConfigurar(medico)}
        />
      )}

      {/* Modal Configurar Comisiones */}
      {showConfigModal && medicoParaConfigurar && (
        <ConfigurarComisionesMedicoModal
          medico={medicoParaConfigurar}
          onClose={() => {
            setShowConfigModal(false)
            setMedicoParaConfigurar(null)
          }}
          onSave={() => {
            loadComisiones()
          }}
        />
      )}
    </div>
  )
}