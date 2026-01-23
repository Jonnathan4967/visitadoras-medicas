import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, Stethoscope, MapPin, Phone, Building, Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import './MedicosVisitadora.css'

export default function MedicosVisitadora() {
  const [medicos, setMedicos] = useState([])
  const [medicosFiltrados, setMedicosFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    clinica: '',
    especialidad: '',
    telefono: '',
    municipio: '',
    direccion: '',
    referencia: ''
  })

  useEffect(() => {
    loadMedicos()
  }, [])

  useEffect(() => {
    filtrarMedicos()
  }, [busqueda, medicos])

  const loadMedicos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('medicos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (data) {
      setMedicos(data)
      setMedicosFiltrados(data)
    }
    setLoading(false)
  }

  const filtrarMedicos = () => {
    if (!busqueda.trim()) {
      setMedicosFiltrados(medicos)
      return
    }

    const termino = busqueda.toLowerCase()
    const filtrados = medicos.filter(m =>
      m.nombre?.toLowerCase().includes(termino) ||
      m.clinica?.toLowerCase().includes(termino) ||
      m.municipio?.toLowerCase().includes(termino) ||
      m.especialidad?.toLowerCase().includes(termino)
    )
    setMedicosFiltrados(filtrados)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      alert('El nombre es obligatorio')
      return
    }

    setGuardando(true)

    try {
      if (editando) {
        const { error } = await supabase
          .from('medicos')
          .update(formData)
          .eq('id', editando)

        if (error) throw error
        alert('✅ Médico actualizado correctamente')
      } else {
        const { error } = await supabase
          .from('medicos')
          .insert([{ ...formData, activo: true }])

        if (error) throw error
        alert('✅ Médico agregado correctamente')
      }

      setShowModal(false)
      resetForm()
      loadMedicos()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const handleEditar = (medico) => {
    setEditando(medico.id)
    setFormData({
      nombre: medico.nombre || '',
      clinica: medico.clinica || '',
      especialidad: medico.especialidad || '',
      telefono: medico.telefono || '',
      municipio: medico.municipio || '',
      direccion: medico.direccion || '',
      referencia: medico.referencia || ''
    })
    setShowModal(true)
  }

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) return

    try {
      const { error } = await supabase
        .from('medicos')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
      alert('✅ Médico eliminado correctamente')
      loadMedicos()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      clinica: '',
      especialidad: '',
      telefono: '',
      municipio: '',
      direccion: '',
      referencia: ''
    })
    setEditando(null)
  }

  const handleNuevo = () => {
    resetForm()
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando médicos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="medicos-visitadora">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Directorio de Médicos</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {medicosFiltrados.length} médicos registrados
            </p>
          </div>
          
          <button onClick={handleNuevo} className="btn btn-primary">
            <Plus size={18} />
            Agregar Médico
          </button>
        </div>

        {/* Buscador */}
        <div className="search-section">
          <div className="search-container">
            <Search size={20} />
            <input
              type="text"
              className="search-input-medicos"
              placeholder="Buscar por nombre, clínica, municipio o especialidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de Médicos */}
        <div className="medicos-grid">
          {medicosFiltrados.length === 0 ? (
            <div className="empty-state">
              <Stethoscope size={48} color="#9ca3af" />
              <h3>No se encontraron médicos</h3>
              <p>Intenta ajustar tu búsqueda o agrega un nuevo médico</p>
            </div>
          ) : (
            medicosFiltrados.map((medico) => (
              <div key={medico.id} className="medico-card-view">
                <div className="medico-header">
                  <div className="medico-avatar">
                    <Stethoscope size={24} />
                  </div>
                  <div className="medico-info-principal">
                    <h4>{medico.nombre}</h4>
                    {medico.especialidad && (
                      <span className="especialidad-badge">{medico.especialidad}</span>
                    )}
                  </div>
                </div>

                <div className="medico-details">
                  {medico.clinica && (
                    <div className="detail-item">
                      <Building size={16} />
                      <span>{medico.clinica}</span>
                    </div>
                  )}

                  {medico.municipio && (
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>{medico.municipio}</span>
                    </div>
                  )}

                  {medico.telefono && (
                    <div className="detail-item">
                      <Phone size={16} />
                      <a href={`tel:${medico.telefono}`}>{medico.telefono}</a>
                    </div>
                  )}

                  {medico.direccion && (
                    <div className="direccion-completa">
                      <p className="direccion-label">Dirección:</p>
                      <p className="direccion-text">{medico.direccion}</p>
                    </div>
                  )}

                  {medico.referencia && (
                    <div className="referencia">
                      <p className="referencia-label">Referencia:</p>
                      <p className="referencia-text">{medico.referencia}</p>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="medico-actions">
                  <button
                    onClick={() => handleEditar(medico)}
                    className="btn-icon btn-edit"
                    title="Editar médico"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleEliminar(medico.id, medico.nombre)}
                    className="btn-icon btn-delete"
                    title="Eliminar médico"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de agregar/editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-medico">
            <div className="modal-header">
              <h2>{editando ? 'Editar Médico' : 'Agregar Médico'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="medico-form">
              <div className="form-group">
                <label>Nombre del Médico *</label>
                <input
                  type="text"
                  name="nombre"
                  className="input"
                  placeholder="Ej: Dr. Juan Pérez"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Especialidad</label>
                <input
                  type="text"
                  name="especialidad"
                  className="input"
                  placeholder="Ej: Cardiología"
                  value={formData.especialidad}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Clínica/Hospital/Farmacia</label>
                <input
                  type="text"
                  name="clinica"
                  className="input"
                  placeholder="Ej: Hospital Roosevelt"
                  value={formData.clinica}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Municipio</label>
                <input
                  type="text"
                  name="municipio"
                  className="input"
                  placeholder="Ej: Guatemala"
                  value={formData.municipio}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  className="input"
                  placeholder="Ej: 5555-5555"
                  value={formData.telefono}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Dirección Completa</label>
                <textarea
                  name="direccion"
                  className="input"
                  rows="2"
                  placeholder="Dirección exacta del consultorio..."
                  value={formData.direccion}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Referencia</label>
                <textarea
                  name="referencia"
                  className="input"
                  rows="2"
                  placeholder="Referencias adicionales para llegar..."
                  value={formData.referencia}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="btn btn-secondary"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={guardando}
                >
                  <Save size={18} />
                  {guardando ? 'Guardando...' : (editando ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
