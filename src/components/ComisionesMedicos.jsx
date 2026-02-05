import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { DollarSign, Plus, X, Save, Calendar, CheckCircle, Eye, UserPlus, Settings } from 'lucide-react'
import ConfigurarComisionesMedicoModal from './ConfigurarComisionesMedicoModal'
import './ComisionesMedicos.css'

export default function ComisionesMedicos() {
  const user = useAuthStore(state => state.user)
  const [comisiones, setComisiones] = useState([])
  const [medicos, setMedicos] = useState([])
  const [visitadoras, setVisitadoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [showFirmaModal, setShowFirmaModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [medicoParaConfigurar, setMedicoParaConfigurar] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [comisionParaAsignar, setComisionParaAsignar] = useState(null)
  const [visitadoraSeleccionada, setVisitadoraSeleccionada] = useState('')
  const [firmaUrl, setFirmaUrl] = useState('')
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('todas') // pendiente, pagado, todas
  const [filtroVisitadora, setFiltroVisitadora] = useState('todas')

  const [formData, setFormData] = useState({
    medico_id: '',
    fecha_referencia: new Date().toISOString().split('T')[0],
    paciente_nombre: '',
    estudio_realizado: '',
    monto_comision: '',
    observaciones: '',
    asignada_a: '' // Nueva: puede quedar vacío para pool general
  })

  useEffect(() => {
    loadComisiones()
    loadMedicos()
    loadVisitadoras()
  }, [filtroEstado, filtroVisitadora])

  const loadComisiones = async () => {
    setLoading(true)
    
    let query = supabase
      .from('vista_comisiones_medicos')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtro por estado
    if (filtroEstado !== 'todas') {
      query = query.eq('estado', filtroEstado)
    }

    // Filtro por visitadora
    if (filtroVisitadora !== 'todas') {
      query = query.eq('visitadora_id', filtroVisitadora)
    }

    const { data, error } = await query

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

  const loadVisitadoras = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, email')
      .eq('role', 'visitadora')
      .order('nombre')

    if (data) {
      setVisitadoras(data)
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
      const dataToInsert = {
        medico_id: formData.medico_id,
        visitadora_id: user.id,
        fecha_referencia: formData.fecha_referencia,
        paciente_nombre: formData.paciente_nombre,
        estudio_realizado: formData.estudio_realizado,
        monto_comision: formData.monto_comision,
        observaciones: formData.observaciones,
        estado: 'pendiente'
      }

      // Solo agregar asignada_a si se seleccionó una visitadora
      if (formData.asignada_a && formData.asignada_a !== '') {
        dataToInsert.asignada_a = formData.asignada_a
      }

      const { error } = await supabase
        .from('comisiones_medicos')
        .insert([dataToInsert])

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

  const abrirModalAsignar = (comision) => {
    setComisionParaAsignar(comision)
    setVisitadoraSeleccionada('')
    setShowAsignarModal(true)
  }

  const handleAsignar = async () => {
    if (!visitadoraSeleccionada) {
      alert('⚠️ Debes seleccionar una visitadora')
      return
    }

    try {
      const { error } = await supabase
        .rpc('asignar_comision', {
          p_comision_id: comisionParaAsignar.id,
          p_visitadora_id: visitadoraSeleccionada
        })

      if (error) throw error

      alert('✅ Comisión asignada exitosamente')
      setShowAsignarModal(false)
      loadComisiones()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const verFirma = (url) => {
    setFirmaUrl(url)
    setShowFirmaModal(true)
  }

  const resetForm = () => {
    setFormData({
      medico_id: '',
      fecha_referencia: new Date().toISOString().split('T')[0],
      paciente_nombre: '',
      estudio_realizado: '',
      monto_comision: '',
      observaciones: '',
      asignada_a: ''
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
              Registro y gestión de comisiones por referencias
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setShowConfigModal(true)} 
              className="btn btn-secondary"
            >
              <Settings size={18} />
              Configurar Comisiones
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus size={18} />
              Registrar Comisión
            </button>
          </div>
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

        {/* Filtros */}
        <div className="filtros-section">
          <div className="filtros-grid">
            <div className="filtro-item">
              <label>Estado:</label>
              <select 
                className="input-small"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="pagado">Pagadas</option>
              </select>
            </div>

            <div className="filtro-item">
              <label>Visitadora:</label>
              <select 
                className="input-small"
                value={filtroVisitadora}
                onChange={(e) => setFiltroVisitadora(e.target.value)}
              >
                <option value="todas">Todas</option>
                {visitadoras.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
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
                  <th>Fecha Ref.</th>
                  <th>Médico</th>
                  <th>Paciente</th>
                  <th>Estudio</th>
                  <th>Monto</th>
                  <th>Asignado a</th>
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
                      {comision.asignada_a_nombre ? (
                        <span className="badge badge-asignada">{comision.asignada_a_nombre}</span>
                      ) : (
                        <span className="badge badge-pool">Pool General</span>
                      )}
                    </td>
                    <td>
                      {comision.estado === 'pagado' ? (
                        <div>
                          <span className="badge badge-pagado">Pagado</span>
                          <div className="pago-info">
                            <small>Por: {comision.pagado_por_nombre}</small>
                            <small>{new Date(comision.fecha_hora_pago).toLocaleDateString('es-ES')}</small>
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-pendiente">Pendiente</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {comision.estado === 'pendiente' && !comision.asignada_a_id && (
                          <button
                            onClick={() => abrirModalAsignar(comision)}
                            className="btn btn-small btn-secondary"
                            title="Asignar a visitadora"
                          >
                            <UserPlus size={14} />
                          </button>
                        )}
                        {comision.estado === 'pagado' && comision.firma_recibido_url && (
                          <button
                            onClick={() => verFirma(comision.firma_recibido_url)}
                            className="btn btn-small btn-secondary"
                            title="Ver firma"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
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

              <div className="form-row">
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
                  <label>Asignar a Visitadora (opcional)</label>
                  <select
                    name="asignada_a"
                    className="input"
                    value={formData.asignada_a}
                    onChange={handleChange}
                  >
                    <option value="">Pool General (cualquiera puede pagar)</option>
                    {visitadoras.map((v) => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    Si no asignas, quedará disponible para todas las visitadoras
                  </small>
                </div>
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

      {/* Modal Asignar */}
      {showAsignarModal && comisionParaAsignar && (
        <div className="modal-overlay">
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Asignar Comisión</h2>
              <button onClick={() => setShowAsignarModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Asignar comisión de <strong>{comisionParaAsignar.medico_nombre}</strong> ({formatMonto(comisionParaAsignar.monto_comision)})
              </p>

              <div className="form-group">
                <label>Seleccionar Visitadora</label>
                <select
                  className="input"
                  value={visitadoraSeleccionada}
                  onChange={(e) => setVisitadoraSeleccionada(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {visitadoras.map((v) => (
                    <option key={v.id} value={v.id}>{v.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-actions">
                <button
                  onClick={() => setShowAsignarModal(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAsignar}
                  className="btn btn-primary"
                >
                  Asignar
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

      {/* Modal Seleccionar Médico para Configurar */}
      {showConfigModal && !medicoParaConfigurar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Seleccionar Médico</h2>
              <button onClick={() => setShowConfigModal(false)} className="btn-close">
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Selecciona el médico para configurar sus comisiones:
              </p>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Médico:
              </label>
              <select
                className="input"
                style={{ marginBottom: '20px' }}
                onChange={(e) => {
                  const medico = medicos.find(m => m.id === e.target.value)
                  if (medico) {
                    setMedicoParaConfigurar(medico)
                  }
                }}
                defaultValue=""
              >
                <option value="">-- Selecciona un médico --</option>
                {medicos.map((medico) => (
                  <option key={medico.id} value={medico.id}>
                    {medico.nombre} {medico.clinica ? `- ${medico.clinica}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
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