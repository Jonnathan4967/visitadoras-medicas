import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, Plus, Search, Edit2, Trash2, Stethoscope, MapPin, Phone, Building, X, Save } from 'lucide-react'
import * as XLSX from 'xlsx'
import './GestionMedicos.css'

export default function GestionMedicos() {
  const [medicos, setMedicos] = useState([])
  const [medicosFiltrados, setMedicosFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [importando, setImportando] = useState(false)
  
  const [formData, setFormData] = useState({
    nombre: '',
    clinica: '',
    especialidad: '',
    telefono: '',
    municipio: '',
    direccion: '',
    referencia: '',
    especial: ''
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
    setGuardando(true)

    try {
      if (editando) {
        const { error } = await supabase
          .from('medicos')
          .update(formData)
          .eq('id', editando)

        if (error) throw error
        alert('✅ Médico actualizado')
      } else {
        const { error } = await supabase
          .from('medicos')
          .insert([{ ...formData, activo: true }])

        if (error) throw error
        alert('✅ Médico agregado')
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
      referencia: medico.referencia || '',
      especial: medico.especial || ''
    })
    setShowModal(true)
  }

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return

    try {
      const { error } = await supabase
        .from('medicos')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
      alert('✅ Médico eliminado')
      loadMedicos()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleImportExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImportando(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const medicosToInsert = jsonData
        .filter(row => row['NOMBRE DEL MEDICO/ENCARGADO'])
        .map(row => ({
          nombre: row['NOMBRE DEL MEDICO/ENCARGADO'] || '',
          clinica: row['CLINICA/FARMACIA/C.S.'] || '',
          especialidad: row['ESPECIALIDAD'] || '',
          telefono: row['NUMERO DE TELEFONO 2'] || '',
          municipio: row['MUNICIPIO'] || '',
          direccion: row['DIRECCIÓN EXACTA'] || '',
          referencia: row['REFERENCIA'] || '',
          especial: row['ESPECIAL'] || '',
          activo: true
        }))

      const { error } = await supabase
        .from('medicos')
        .insert(medicosToInsert)

      if (error) throw error

      alert(`✅ ${medicosToInsert.length} médicos importados`)
      setShowImportModal(false)
      loadMedicos()
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setImportando(false)
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
      referencia: '',
      especial: ''
    })
    setEditando(null)
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
    <div className="gestion-medicos">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Gestión de Médicos</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {medicosFiltrados.length} médicos registrados
            </p>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowImportModal(true)} className="btn btn-secondary">
              <Upload size={18} />
              Importar Excel
            </button>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
              <Plus size={18} />
              Agregar Médico
            </button>
          </div>
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

        {/* Grid de Médicos */}
        <div className="medicos-grid">
          {medicosFiltrados.length === 0 ? (
            <div className="empty-state">
              <Stethoscope size={48} color="#9ca3af" />
              <h3>No se encontraron médicos</h3>
              <p>Intenta ajustar tu búsqueda o agrega un nuevo médico</p>
            </div>
          ) : (
            medicosFiltrados.map((medico) => (
              <div key={medico.id} className="medico-card-admin">
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

                {/* Botones de Acción */}
                <div className="card-actions">
                  <button
                    onClick={() => handleEditar(medico)}
                    className="btn-card btn-edit"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(medico.id, medico.nombre)}
                    className="btn-card btn-delete"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-medico">
            <div className="modal-header">
              <h2>{editando ? 'Editar Médico' : 'Agregar Médico'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="medico-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    name="nombre"
                    className="input"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clínica/Centro</label>
                  <input
                    type="text"
                    name="clinica"
                    className="input"
                    value={formData.clinica}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Especialidad</label>
                  <input
                    type="text"
                    name="especialidad"
                    className="input"
                    value={formData.especialidad}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    className="input"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Municipio</label>
                <input
                  type="text"
                  name="municipio"
                  className="input"
                  value={formData.municipio}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Dirección</label>
                <textarea
                  name="direccion"
                  className="input"
                  rows="2"
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
                  value={formData.referencia}
                  onChange={handleChange}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
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
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Importar Médicos desde Excel</h2>
              <button onClick={() => setShowImportModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Selecciona un archivo Excel con los médicos a importar.
              </p>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ marginBottom: '16px' }}
              />

              {importando && <p>Importando...</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}