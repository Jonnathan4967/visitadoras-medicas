import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, Calendar, CheckCircle, Clock, Download, TrendingUp, Upload, FileSpreadsheet, Trash2, Search, Eye } from 'lucide-react'
import ImportarComisiones from './ImportarComisiones'
import DetallePagoComisionModal from './DetallePagoComisionModal'
import { descargarPlantillaComisiones } from '../utils/plantillaComisiones'
import { exportarReporteComisiones } from '../utils/exportarReporteComisiones'
import './ComisionesMensuales.css'

export default function ComisionesMensualesAdmin() {
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas') // todas, pendientes, pagadas
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDetalleModal, setShowDetalleModal] = useState(false)
  const [comisionSeleccionada, setComisionSeleccionada] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [stats, setStats] = useState({
    totalPendiente: 0,
    totalPagado: 0,
    cantidadPendiente: 0,
    cantidadPagada: 0
  })

  useEffect(() => {
    loadComisiones()
  }, [])

  useEffect(() => {
    calcularStats()
  }, [comisiones])

  const loadComisiones = async () => {
    setLoading(true)
    
    console.log('📊 Cargando comisiones desde vista...')
    
    const { data, error } = await supabase
      .from('vista_comisiones_mensuales')
      .select('*')
      .order('estado', { ascending: true })
      .order('total_comision', { ascending: false })

    if (error) {
      console.error('❌ Error al cargar comisiones:', error)
    } else {
      console.log(`✅ ${data?.length || 0} comisiones cargadas`)
      setComisiones(data || [])
    }
    
    setLoading(false)
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

  const comisionesFiltradas = comisiones.filter(c => {
    // Filtro por estado
    let pasaFiltroEstado = true
    if (filtro === 'pendientes') pasaFiltroEstado = c.estado === 'pendiente'
    if (filtro === 'pagadas') pasaFiltroEstado = c.estado === 'pagado'
    
    // Filtro por búsqueda
    let pasaBusqueda = true
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      pasaBusqueda = 
        c.nombre_medico?.toLowerCase().includes(termino) ||
        c.nombre_visitadora?.toLowerCase().includes(termino)
    }
    
    return pasaFiltroEstado && pasaBusqueda
  })

  const exportarExcel = async () => {
    await exportarReporteComisiones(comisiones)
  }

  const limpiarPendientes = async () => {
    const pendientes = comisiones.filter(c => c.estado === 'pendiente')
    
    if (pendientes.length === 0) {
      alert('ℹ️ No hay comisiones pendientes para eliminar')
      return
    }

    if (!confirm(
      `⚠️ ¿Eliminar SOLO las comisiones PENDIENTES?\n\n` +
      `Se eliminarán ${pendientes.length} comisiones por un total de Q${stats.totalPendiente.toFixed(2)}\n\n` +
      `Las comisiones PAGADAS NO se eliminarán.\n\n` +
      `Esta acción NO se puede deshacer.`
    )) {
      return
    }

    setEliminando(true)

    try {
      console.log('🗑️ Eliminando comisiones pendientes...')
      
      const { data, error } = await supabase
        .from('comisiones_mensuales')
        .delete()
        .eq('estado', 'pendiente')
        .select()

      if (error) {
        console.error('❌ Error al eliminar:', error)
        throw error
      }

      console.log(`✅ Eliminadas ${data?.length || 0} comisiones pendientes`)

      alert(`✅ Se eliminaron ${data?.length || 0} comisiones pendientes correctamente`)
      
      await loadComisiones()
      
    } catch (error) {
      console.error('💥 Error completo:', error)
      alert('❌ Error al eliminar: ' + error.message)
    } finally {
      setEliminando(false)
    }
  }

  const limpiarTodo = async () => {
    if (comisiones.length === 0) {
      alert('ℹ️ No hay comisiones para eliminar')
      return
    }

    const totalComisiones = comisiones.length
    const totalMonto = stats.totalPendiente + stats.totalPagado

    if (!confirm(
      `🚨 ¿ELIMINAR TODAS LAS COMISIONES DEL MES?\n\n` +
      `Se eliminarán ${totalComisiones} comisiones:\n` +
      `  • ${stats.cantidadPendiente} pendientes (Q${stats.totalPendiente.toFixed(2)})\n` +
      `  • ${stats.cantidadPagada} pagadas (Q${stats.totalPagado.toFixed(2)})\n\n` +
      `Total: Q${totalMonto.toFixed(2)}\n\n` +
      `⚠️ ESTO BORRARÁ TODO EL MES\n` +
      `Esta acción NO se puede deshacer.\n\n` +
      `¿Estás SEGURO de continuar?`
    )) {
      return
    }

    // Segunda confirmación para mayor seguridad
    if (!confirm(
      `⚠️ ÚLTIMA CONFIRMACIÓN\n\n` +
      `Vas a eliminar ${totalComisiones} comisiones por Q${totalMonto.toFixed(2)}\n\n` +
      `Escribe en la consola si estás seguro o cancela ahora.`
    )) {
      return
    }

    setEliminando(true)

    try {
      console.log('🗑️ Eliminando TODAS las comisiones del mes...')
      
      // Eliminar TODO (sin filtro de estado)
      const { data, error } = await supabase
        .from('comisiones_mensuales')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Elimina todo
        .select()

      if (error) {
        console.error('❌ Error al eliminar:', error)
        throw error
      }

      console.log(`✅ Eliminadas ${data?.length || 0} comisiones en total`)

      alert(
        `✅ Todas las comisiones han sido eliminadas\n\n` +
        `📊 Total eliminado: ${data?.length || 0} comisiones\n` +
        `💰 Monto total: Q${totalMonto.toFixed(2)}`
      )
      
      await loadComisiones()
      
    } catch (error) {
      console.error('💥 Error completo:', error)
      alert('❌ Error al eliminar: ' + error.message)
    } finally {
      setEliminando(false)
    }
  }

  const handleVerDetalle = (comision) => {
    setComisionSeleccionada(comision)
    setShowDetalleModal(true)
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Cargando comisiones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="comisiones-mensuales">
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

      {/* Header y Filtros */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Comisiones del Mes</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Gestión de comisiones mensuales
            </p>
          </div>
          <div className="header-actions-group">
            <button onClick={descargarPlantillaComisiones} className="btn btn-secondary">
              <FileSpreadsheet size={18} />
              Plantilla
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn btn-primary">
              <Upload size={18} />
              Importar
            </button>
            <button onClick={exportarExcel} className="btn btn-success">
              <Download size={18} />
              Exportar
            </button>
            
            {/* Botón Limpiar Pendientes */}
            {stats.cantidadPendiente > 0 && (
              <button 
                onClick={limpiarPendientes} 
                className="btn"
                disabled={eliminando}
                style={{ 
                  backgroundColor: '#f59e0b',
                  color: 'white'
                }}
                title="Eliminar solo comisiones pendientes"
              >
                {eliminando ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Limpiar Pendientes</span>
                  </>
                )}
              </button>
            )}
            
            {/* Botón Limpiar TODO */}
            {comisiones.length > 0 && (
              <button 
                onClick={limpiarTodo} 
                className="btn btn-danger"
                disabled={eliminando}
                title="Eliminar TODAS las comisiones (pendientes y pagadas)"
              >
                {eliminando ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Limpiar Todo</span>
                  </>
                )}
              </button>
            )}
          </div>
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
            <Search size={20} />
            <input
              type="text"
              className="search-input-comisiones"
              placeholder="Buscar por médico o visitadora..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Grid de Cards */}
        <div className="comisiones-admin-grid">
          {comisionesFiltradas.length === 0 ? (
            <div className="empty-comisiones">
              <CheckCircle size={64} color="#10b981" />
              <h3>No hay comisiones</h3>
              <p>
                {busqueda 
                  ? 'No se encontraron comisiones con este filtro'
                  : filtro === 'pendientes' 
                    ? 'No hay comisiones pendientes' 
                    : filtro === 'pagadas'
                      ? 'No hay comisiones pagadas'
                      : 'No hay comisiones registradas'
                }
              </p>
            </div>
          ) : (
            comisionesFiltradas.map((comision) => (
              <div key={comision.id} className="comision-admin-card">
                {/* Header */}
                <div className="comision-card-header">
                  <div className="medico-info-header">
                    <DollarSign size={20} />
                    <h4>{comision.nombre_medico}</h4>
                  </div>
                  {comision.estado === 'pendiente' ? (
                    <span className="badge-estado pendiente">
                      <Clock size={14} />
                      Pendiente
                    </span>
                  ) : (
                    <span className="badge-estado pagado">
                      <CheckCircle size={14} />
                      Pagado
                    </span>
                  )}
                </div>

                {/* Desglose */}
                <div className="comision-desglose">
                  <div className="desglose-item">
                    <span className="desglose-label">Comisión USG</span>
                    <span className="desglose-valor">Q{parseFloat(comision.comision_usg || 0).toFixed(2)}</span>
                  </div>
                  <div className="desglose-item">
                    <span className="desglose-label">Comisión Especial</span>
                    <span className="desglose-valor">Q{parseFloat(comision.comision_especial || 0).toFixed(2)}</span>
                  </div>
                  <div className="desglose-item">
                    <span className="desglose-label">Comisión EKG/PAP/LABS</span>
                    <span className="desglose-valor">Q{parseFloat(comision.comision_ekg || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="comision-total-section">
                  <span className="total-label">Total:</span>
                  <span className="total-valor">Q{parseFloat(comision.total_comision || 0).toFixed(2)}</span>
                </div>

                {/* Info de Pago (si está pagado) */}
                {comision.estado === 'pagado' && (
                  <>
                    <div className="comision-pago-info">
                      <div className="pago-info-item">
                        <span className="pago-label">Pagado por:</span>
                        <span className="pago-valor">{comision.nombre_visitadora || '-'}</span>
                      </div>
                      <div className="pago-info-item">
                        <span className="pago-label">Fecha:</span>
                        <span className="pago-valor">
                          {comision.fecha_pago 
                            ? new Date(comision.fecha_pago).toLocaleDateString('es-GT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : '-'
                          }
                        </span>
                      </div>
                    </div>
                    {/* Botón Ver Detalle */}
                    <button 
                      onClick={() => handleVerDetalle(comision)}
                      className="btn btn-primary btn-full btn-ver-detalle"
                    >
                      <Eye size={16} />
                      Ver Detalle del Pago
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Importar */}
      {showImportModal && (
        <ImportarComisiones
          onImportExitoso={() => {
            setShowImportModal(false)
            loadComisiones()
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {/* Modal Ver Detalle */}
      {showDetalleModal && comisionSeleccionada && (
        <DetallePagoComisionModal
          comision={comisionSeleccionada}
          onClose={() => {
            setShowDetalleModal(false)
            setComisionSeleccionada(null)
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}