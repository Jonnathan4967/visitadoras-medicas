import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, Plus, Search, Edit2, Trash2, FileSpreadsheet, X, Save } from 'lucide-react'
import * as XLSX from 'xlsx'
import './GestionMedicos.css'

export default function GestionMedicos() {
  const [medicos, setMedicos] = useState([])
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

  const loadMedicos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('medicos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (data) {
      setMedicos(data)
    }
    setLoading(false)
  }

  const handleBusqueda = async (termino) => {
    setBusqueda(termino)
    if (termino.length < 2) {
      loadMedicos()
      return
    }

    const { data } = await supabase
      .rpc('buscar_medicos', { termino })

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
      if (editando) {
        // Actualizar
        const { error } = await supabase
          .from('medicos')
          .update(formData)
          .eq('id', editando)

        if (error) throw error
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('medicos')
          .insert([formData])

        if (error) throw error
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

  const handleEliminar = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este médico?')) return

    const { error } = await supabase
      .from('medicos')
      .update({ activo: false })
      .eq('id', id)

    if (!error) {
      loadMedicos()
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

  const handleImportarExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImportando(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Mapear columnas del Excel
      const medicosData = jsonData.map(row => ({
        nombre: row['NOMBRE DEL MEDICO/ENCARGADO  '] || row['NOMBRE DEL MEDICO/ENCARGADO'] || '',
        clinica: row['CLINICA / FARMACIA / C.S.'] || '',
        especialidad: row['ESPECIALIDAD '] || row['ESPECIALIDAD'] || '',
        telefono: row['NUMERO DE TELEFONO 2'] || '',
        municipio: row['MUNICIPIO'] || '',
        direccion: row['DIRECCIÓN EXACTA '] || row['DIRECCIÓN EXACTA'] || '',
        referencia: row['REFERENCIA '] || row['REFERENCIA'] || '',
        especial: row['ESPECIAL '] || row['ESPECIAL'] || '',
        activo: true
      })).filter(m => m.nombre && m.nombre.trim() !== '')

      // Insertar en Supabase
      const { error } = await supabase
        .from('medicos')
        .insert(medicosData)

      if (error) throw error

      alert(`✅ ${medicosData.length} médicos importados exitosamente`)
      setShowImportModal(false)
      loadMedicos()
    } catch (error) {
      alert('Error al importar: ' + error.message)
    } finally {
      setImportando(false)
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
    <div className="gestion-medicos">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Base de Datos de Médicos</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {medicos.length} médicos registrados
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary"
            >
              <Upload size={18} />
              Importar Excel
            </button>
            <button 
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="btn btn-primary"
            >
              <Plus size={18} />
              Agregar Médico
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, clínica o municipio..."
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Tabla de Médicos */}
        <div className="table-container">
          <table className="medicos-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Clínica/Establecimiento</th>
                <th>Especialidad</th>
                <th>Teléfono</th>
                <th>Municipio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {medicos.map((medico) => (
                <tr key={medico.id}>
                  <td><strong>{medico.nombre}</strong></td>
                  <td>{medico.clinica || '-'}</td>
                  <td>{medico.especialidad || '-'}</td>
                  <td>{medico.telefono || '-'}</td>
                  <td>{medico.municipio || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEditar(medico)}
                        className="btn-icon"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleEliminar(medico.id)}
                        className="btn-icon btn-danger"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editando ? 'Editar Médico' : 'Agregar Médico'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="medico-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del Médico/Encargado *</label>
                  <input
                    name="nombre"
                    type="text"
                    className="input"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clínica/Farmacia/C.S.</label>
                  <input
                    name="clinica"
                    type="text"
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
                    name="especialidad"
                    type="text"
                    className="input"
                    value={formData.especialidad}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    name="telefono"
                    type="text"
                    className="input"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Municipio</label>
                  <input
                    name="municipio"
                    type="text"
                    className="input"
                    value={formData.municipio}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Dirección Exacta</label>
                  <input
                    name="direccion"
                    type="text"
                    className="input"
                    value={formData.direccion}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Referencia</label>
                <input
                  name="referencia"
                  type="text"
                  className="input"
                  value={formData.referencia}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Especial</label>
                <textarea
                  name="especial"
                  className="input"
                  value={formData.especial}
                  onChange={handleChange}
                  rows="2"
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
          <div className="modal-content modal-small">
            <div className="modal-header">
              <h2>Importar Base de Datos</h2>
              <button onClick={() => setShowImportModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <div className="import-content">
              <div className="import-icon">
                <FileSpreadsheet size={48} color="#10b981" />
              </div>
              <h3>Selecciona tu archivo Excel</h3>
              <p>El archivo debe contener las siguientes columnas:</p>
              <ul className="columns-list">
                <li>NOMBRE DEL MEDICO/ENCARGADO</li>
                <li>CLINICA / FARMACIA / C.S.</li>
                <li>ESPECIALIDAD</li>
                <li>NUMERO DE TELEFONO 2</li>
                <li>MUNICIPIO</li>
                <li>DIRECCIÓN EXACTA</li>
                <li>REFERENCIA</li>
                <li>ESPECIAL</li>
              </ul>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportarExcel}
                style={{ display: 'none' }}
                id="file-input"
                disabled={importando}
              />
              
              <label htmlFor="file-input" className="btn btn-primary btn-upload">
                <Upload size={18} />
                {importando ? 'Importando...' : 'Seleccionar Archivo Excel'}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}