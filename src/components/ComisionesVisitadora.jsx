import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { DollarSign, Calendar, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import './Comisiones.css'

export default function ComisionesVisitadora() {
  const user = useAuthStore(state => state.user)
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPendiente: 0,
    totalPagado: 0,
    totalGeneral: 0
  })

  useEffect(() => {
    loadComisiones()
  }, [user])

  const loadComisiones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comisiones')
      .select('*')
      .eq('visitadora_id', user.id)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (data) {
      setComisiones(data)
      
      // Calcular estadísticas
      const pendiente = data
        .filter(c => c.estado === 'pendiente')
        .reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
      
      const pagado = data
        .filter(c => c.estado === 'pagado')
        .reduce((sum, c) => sum + parseFloat(c.monto_pagado || 0), 0)
      
      setStats({
        totalPendiente: pendiente,
        totalPagado: pagado,
        totalGeneral: pendiente + pagado
      })
    }
    setLoading(false)
  }

  const getMesNombre = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[mes - 1]
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto)
  }

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Cargando comisiones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="comisiones-container">
      {/* Estadísticas */}
      <div className="comisiones-stats">
        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Clock size={24} color="#f59e0b" />
          </div>
          <div className="stat-info">
            <p className="stat-label">Pendiente de Pago</p>
            <h3 className="stat-value">{formatMonto(stats.totalPendiente)}</h3>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Pagado</p>
            <h3 className="stat-value">{formatMonto(stats.totalPagado)}</h3>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <TrendingUp size={24} color="#3b82f6" />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total General</p>
            <h3 className="stat-value">{formatMonto(stats.totalGeneral)}</h3>
          </div>
        </div>
      </div>

      {/* Lista de Comisiones */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Historial de Comisiones</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Detalle de tus comisiones mensuales
            </p>
          </div>
          <DollarSign size={24} color="#10b981" />
        </div>

        {comisiones.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={48} color="#9ca3af" />
            <h3>No hay comisiones registradas</h3>
            <p>Las comisiones aparecerán aquí cuando sean registradas</p>
          </div>
        ) : (
          <div className="comisiones-table-container">
            <table className="comisiones-table">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Visitas</th>
                  <th>Comisión</th>
                  <th>Pagado</th>
                  <th>Estado</th>
                  <th>Fecha Pago</th>
                </tr>
              </thead>
              <tbody>
                {comisiones.map((comision) => (
                  <tr key={comision.id}>
                    <td>
                      <div className="periodo">
                        <Calendar size={16} />
                        <span>{getMesNombre(comision.mes)} {comision.anio}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue">
                        {comision.total_visitas}
                      </span>
                    </td>
                    <td>
                      <strong>{formatMonto(comision.monto_comision)}</strong>
                    </td>
                    <td>
                      {formatMonto(comision.monto_pagado || 0)}
                    </td>
                    <td>
                      {comision.estado === 'pagado' ? (
                        <span className="status-badge status-pagado">
                          <CheckCircle size={14} />
                          Pagado
                        </span>
                      ) : (
                        <span className="status-badge status-pendiente">
                          <Clock size={14} />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="fecha-pago">
                      {formatFecha(comision.fecha_pago)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}