import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { DollarSign, Plus, X, Save, CheckCircle, AlertCircle } from 'lucide-react'
import './Comisiones.css'

export default function ComisionesAdmin() {
  const [visitadoras, setVisitadoras] = useState([])
  const [comisiones, setComisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    visitadora_id: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    monto_comision: '',
    observaciones: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Cargar visitadoras
    const { data: visitadorasData } = await supabase
      .from('profiles')
      .select('id, nombre, email')
      .eq('role', 'visitadora')
      .order('nombre')

    if (visitadorasData) {
      setVisitadoras(visitadorasData)
    }

    // Cargar todas las comisiones
    const { data: comisionesData } = await supabase
      .from('comisiones')
      .select(`
        *,
        profiles (nombre, email)
      `)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (comisionesData) {
      setComisiones(comisionesData)
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Contar visitas del mes
      const primerDia = new Date(formData.anio, formData.mes - 1, 1).toISOString()
      const ultimoDia = new Date(formData.anio, formData.mes, 0, 23, 59, 59).toISOString()

      const { count: totalVisitas } = await supabase
        .from('visitas')
        .select('*', { count: 'exact', head: true })
        .eq('visitadora_id', formData.visitadora_id)
        .gte('created_at', primerDia)
        .lte('created_at', ultimoDia)

      // Insertar o actualizar comisión
      const { error: upsertError } = await supabase
        .from('comisiones')
        .upsert({
          visitadora_id: formData.visitadora_id,
          mes: parseInt(formData.mes),
          anio: parseInt(formData.anio),
          total_visitas: totalVisitas || 0,
          monto_comision: parseFloat(formData.monto_comision),
          estado: 'pendiente'
        }, {
          onConflict: 'visitadora_id,mes,anio'
        })

      if (upsertError) throw upsertError

      setSuccess('Comisión registrada exitosamente')
      setShowModal(false)
      setFormData({
        visitadora_id: '',
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        monto_comision: '',
        observaciones: ''
      })
      
      loadData()

      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const marcarComoPagado = async (comisionId, monto) => {
    try {
      const { error } = await supabase
        .from('comisiones')
        .update({
          estado: 'pagado',
          monto_pagado: monto,
          fecha_pago: new Date().toISOString()
        })
        .eq('id', comisionId)

      if (error) throw error

      setSuccess('Comisión marcada como pagada')
      loadData()
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>Gestión de Comisiones</h3>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            Administra las comisiones de las visitadoras
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Registrar Comisión
        </button>
      </div>

      {success && (
        <div className="success-alert">
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      {comisiones.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={48} color="#9ca3af" />
          <h3>No hay comisiones registradas</h3>
          <p>Comienza registrando comisiones para las visitadoras</p>
        </div>
      ) : (
        <div className="comisiones-table-container">
          <table className="comisiones-table">
            <thead>
              <tr>
                <th>Visitadora</th>
                <th>Período</th>
                <th>Visitas</th>
                <th>Comisión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comisiones.map((comision) => (
                <tr key={comision.id}>
                  <td>
                    <div className="visitadora-info">
                      <strong>{comision.profiles?.nombre || 'Sin nombre'}</strong>
                      <small>{comision.profiles?.email}</small>
                    </div>
                  </td>
                  <td>
                    {getMesNombre(comision.mes)} {comision.anio}
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
                    {comision.estado === 'pagado' ? (
                      <span className="status-badge status-pagado">
                        <CheckCircle size={14} />
                        Pagado
                      </span>
                    ) : (
                      <span className="status-badge status-pendiente">
                        <DollarSign size={14} />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td>
                    {comision.estado === 'pendiente' && (
                      <button
                        onClick={() => marcarComoPagado(comision.id, comision.monto_comision)}
                        className="btn btn-success btn-small"
                      >
                        Marcar Pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registrar Comisión */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Registrar Comisión</h2>
              <button onClick={() => setShowModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="comision-form">
              <div className="form-group">
                <label htmlFor="visitadora_id">
                  Visitadora <span className="required">*</span>
                </label>
                <select
                  id="visitadora_id"
                  name="visitadora_id"
                  className="input"
                  value={formData.visitadora_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccionar visitadora...</option>
                  {visitadoras.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre || v.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mes">
                    Mes <span className="required">*</span>
                  </label>
                  <select
                    id="mes"
                    name="mes"
                    className="input"
                    value={formData.mes}
                    onChange={handleChange}
                    required
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMesNombre(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="anio">
                    Año <span className="required">*</span>
                  </label>
                  <input
                    id="anio"
                    name="anio"
                    type="number"
                    className="input"
                    value={formData.anio}
                    onChange={handleChange}
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="monto_comision">
                  Monto de Comisión (Q) <span className="required">*</span>
                </label>
                <input
                  id="monto_comision"
                  name="monto_comision"
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.monto_comision}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
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
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}