import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { DollarSign, Plus, X, Save, Calendar, CheckCircle } from 'lucide-react'
import './ComisionesMedicos.css'

export default function ComisionesMedicos() {
  const user = useAuthStore(state => state.user)
  const [comisiones, setComisiones] = useState([])
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [formData, setFormData] = useState({
    medico_id: '',
    fecha_referencia: new Date().toISOString().split('T')[0],
    paciente_nombre: '',
    estudio_realizado: '',
    monto_comision: '',
    observaciones: ''
  })

  useEffect(() => {
    loadComisiones()
    loadMedicos()
  }, [])

  const loadComisiones = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vista_comisiones_medicos')
      .select('*')
      .order('fecha_referencia', { ascending: false })

    if (data) {
      setComisiones(data)
    }
    setLoading(false)
  }

  const loadMedicos = async () => {
    const { data } = await supabase
      .from('medicos')
      .select('id, nombre, clinica, municipio')
      .eq('activo', true)
      .order('nombre')

    if (data) {
      setMedicos(data)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const { error } = await supabase
        .from('comisiones_medicos')
        .insert([{
          ...formData,
          visitadora_id: user.id,
          estado: 'pendiente'
        }])

      if (error) throw error

      alert('✅ Comisión registrada exitosamente')
      setShowModal(false)
      resetForm()
      loadComisiones()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const marcarPagado = async (id) => {
    if (!confirm('¿Marcar esta comisión como pagada?')) return

    const { error } = await supabase
      .from('comisiones_medicos')
      .update({
        estado: 'pagado',
        fecha_pago: new Date().toISOString().split('T')[0]
      })
      .eq('id', id)

    if (!error) {
      loadComisiones()
    }
  }

  const resetForm = () => {
    setFormData({
      medico_id: '',
      fecha_referencia: new Date().toISOString().split('T')[0],
      paciente_nombre: '',
      estudio_realizado: '',
      monto_comision: '',
      observaciones: ''
    })
  }

  const formatMonto = (monto) => {
    return `Q${parseFloat(monto).toFixed(2)}`
  }

  const calcularTotales = () => {
    const total = comisiones.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
    const pagado = comisiones.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
    const pendiente = total - pagado

    return { total, pagado, pendiente }
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
    <div className="comisiones-medicos">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Comisiones para Médicos</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              Registro de comisiones por referencias de pacientes
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={18} />
            Registrar Comisión
          </button>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="stat-label">Total Comisiones</p>
              <p className="stat-value">{formatMonto(totales.total)}</p>
            </div>
          </div>

          <div className="stat-card stat-pagado">
            <div className="stat-icon">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="stat-label">Pagado</p>
              <p className="stat-value">{formatMonto(totales.pagado)}</p>
            </div>
          </div>

          <div className="stat-card stat-pendiente">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div>
              <p className="stat-label">Pendiente</p>
              <p className="stat-value">{formatMonto(totales.pendiente)}</p>
            </div>
          </div>
        </div>

        {/* Tabla de Comisiones */}
        <div className="table-container">
          {comisiones.length === 0 ? (
            <div className="empty-state">
              <DollarSign size={48} color="#9ca3af" />
              <h3>No hay comisiones registradas</h3>
              <p>Las comisiones que registres aparecerán aquí</p>
            </div>
          ) : (
            <table className="comisiones-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Médico</th>
                  <th>Paciente</th>
                  <th>Estudio</th>
                  <th>Comisión</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {comisiones.map((comision) => (
                  <tr key={comision.id}>
                    <td>{new Date(comision.fecha_referencia).toLocaleDateString('es-ES')}</td>
                    <td>
                      <strong>{comision.medico_nombre}</strong>
                      {comision.clinica && <div className="subtitle">{comision.clinica}</div>}
                    </td>
                    <td>{comision.paciente_nombre}</td>
                    <td>{comision.estudio_realizado}</td>
                    <td><strong>{formatMonto(comision.monto_comision)}</strong></td>
                    <td>
                      <span className={`badge badge-${comision.estado}`}>
                        {comision.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </span>
                      {comision.estado === 'pagado' && comision.fecha_pago && (
                        <div className="fecha-pago">
                          {new Date(comision.fecha_pago).toLocaleDateString('es-ES')}
                        </div>
                      )}
                    </td>
                    <td>
                      {comision.estado === 'pendiente' && (
                        <button
                          onClick={() => marcarPagado(comision.id)}
                          className="btn btn-small btn-success"
                        >
                          Marcar Pagado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Registrar Comisión */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Registrar Comisión</h2>
              <button onClick={() => setShowModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="comision-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Médico que Refirió *</label>
                  <select
                    name="medico_id"
                    className="input"
                    value={formData.medico_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar médico...</option>
                    {medicos.map((medico) => (
                      <option key={medico.id} value={medico.id}>
                        {medico.nombre} {medico.clinica ? `- ${medico.clinica}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha de Referencia *</label>
                  <input
                    type="date"
                    name="fecha_referencia"
                    className="input"
                    value={formData.fecha_referencia}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del Paciente *</label>
                  <input
                    type="text"
                    name="paciente_nombre"
                    className="input"
                    placeholder="Ej: Juan Pérez"
                    value={formData.paciente_nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Estudio Realizado *</label>
                  <input
                    type="text"
                    name="estudio_realizado"
                    className="input"
                    placeholder="Ej: Rayos X, Ecografía, etc."
                    value={formData.estudio_realizado}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Monto de Comisión (Q) *</label>
                <input
                  type="number"
                  name="monto_comision"
                  className="input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.monto_comision}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  className="input"
                  rows="3"
                  placeholder="Notas adicionales..."
                  value={formData.observaciones}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={guardando}
                >
                  <Save size={16} />
                  {guardando ? 'Guardando...' : 'Guardar Comisión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}