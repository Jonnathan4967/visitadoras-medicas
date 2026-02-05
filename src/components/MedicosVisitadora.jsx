import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, Stethoscope, MapPin, Phone, Building, Plus, Edit2, Trash2, X, Save, ChevronDown, ChevronUp, Navigation, ExternalLink, FileSpreadsheet } from 'lucide-react'
import ExcelJS from 'exceljs'
import './MedicosVisitadora.css'

export default function MedicosVisitadora() {
  const [medicos, setMedicos] = useState([])
  const [medicosFiltrados, setMedicosFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [showUbicacionForm, setShowUbicacionForm] = useState(false)
  const [capturandoGPS, setCapturandoGPS] = useState(false)
  const [ubicacionesExpandidas, setUbicacionesExpandidas] = useState({})
  
  const [formData, setFormData] = useState({
    nombre: '',
    clinica: '',
    especialidad: '',
    telefono: '',
    municipio: '',
    direccion: '',
    referencia: '',
    latitud: null,
    longitud: null
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
      referencia: medico.referencia || '',
      latitud: medico.latitud || null,
      longitud: medico.longitud || null
    })
    setShowUbicacionForm(medico.latitud && medico.longitud)
    setShowModal(true)
  }

  const capturarUbicacion = () => {
    setCapturandoGPS(true)
    
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      setCapturandoGPS(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitud: position.coords.latitude,
          longitud: position.coords.longitude
        })
        setCapturandoGPS(false)
      },
      (error) => {
        alert('Error al obtener ubicación: ' + error.message)
        setCapturandoGPS(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const limpiarUbicacion = () => {
    setFormData({
      ...formData,
      latitud: null,
      longitud: null
    })
  }

  const toggleUbicacion = (medicoId) => {
    setUbicacionesExpandidas(prev => ({
      ...prev,
      [medicoId]: !prev[medicoId]
    }))
  }

  const abrirEnGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`
    window.open(url, '_blank')
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
      referencia: '',
      latitud: null,
      longitud: null
    })
    setEditando(null)
    setShowUbicacionForm(false)
  }

  const exportarMedicosExcel = async () => {
    try {
      if (medicos.length === 0) {
        alert('No hay médicos para exportar')
        return
      }

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Médicos')
      
      // ENCABEZADO
      worksheet.mergeCells('A1:I1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = 'BASE DE DATOS - MÉDICOS'
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getRow(1).height = 30
      
      worksheet.mergeCells('A2:I2')
      worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      worksheet.getRow(2).height = 8
      
      worksheet.mergeCells('A3:I3')
      const fechaCell = worksheet.getCell('A3')
      fechaCell.value = `Fecha de exportación: ${new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      })}`
      fechaCell.font = { name: 'Arial', size: 11, bold: true }
      fechaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      fechaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      worksheet.getRow(3).height = 20
      
      worksheet.mergeCells('A4:I4')
      const totalCell = worksheet.getCell('A4')
      totalCell.value = `Total de médicos: ${medicos.length}`
      totalCell.font = { name: 'Arial', size: 11, bold: true }
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      totalCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      worksheet.getRow(4).height = 20
      
      // Bordes del encabezado
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 9; col++) {
          const cell = worksheet.getCell(row, col)
          cell.border = {
            top: { style: row === 1 ? 'medium' : 'thin', color: { argb: 'FF3B82F6' } },
            bottom: { style: row === 4 ? 'medium' : 'thin', color: { argb: 'FF3B82F6' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: 'FF3B82F6' } },
            right: { style: col === 9 ? 'medium' : 'thin', color: { argb: 'FF3B82F6' } }
          }
        }
      }
      
      // ENCABEZADOS DE TABLA
      const headers = ['Nombre', 'Clínica', 'Especialidad', 'Teléfono', 'Municipio', 'Dirección', 'Referencia', 'Latitud', 'Longitud']
      const headerRow = worksheet.getRow(6)
      headers.forEach((header, idx) => {
        const cell = headerRow.getCell(idx + 1)
        cell.value = header
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      })
      headerRow.height = 25
      
      // DATOS
      medicos.forEach((medico, idx) => {
        const row = worksheet.getRow(7 + idx)
        const isEven = idx % 2 === 0
        
        row.getCell(1).value = medico.nombre || ''
        row.getCell(2).value = medico.clinica || ''
        row.getCell(3).value = medico.especialidad || ''
        row.getCell(4).value = medico.telefono || ''
        row.getCell(5).value = medico.municipio || ''
        row.getCell(6).value = medico.direccion || ''
        row.getCell(7).value = medico.referencia || ''
        row.getCell(8).value = medico.latitud || ''
        row.getCell(9).value = medico.longitud || ''
        
        // Aplicar estilos
        for (let col = 1; col <= 9; col++) {
          const cell = row.getCell(col)
          cell.font = { name: 'Arial', size: 10 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF3F4F6' } }
          cell.alignment = { vertical: 'middle', wrapText: true }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          }
        }
      })
      
      // Ajustar ancho de columnas
      worksheet.getColumn(1).width = 30  // Nombre
      worksheet.getColumn(2).width = 25  // Clínica
      worksheet.getColumn(3).width = 20  // Especialidad
      worksheet.getColumn(4).width = 15  // Teléfono
      worksheet.getColumn(5).width = 15  // Municipio
      worksheet.getColumn(6).width = 30  // Dirección
      worksheet.getColumn(7).width = 25  // Referencia
      worksheet.getColumn(8).width = 12  // Latitud
      worksheet.getColumn(9).width = 12  // Longitud
      
      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fechaActual = new Date().toLocaleDateString('es-ES').replace(/\//g, '-')
      link.download = `Base_Medicos_${fechaActual}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      
      alert('✅ Base de datos exportada exitosamente')
      
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al exportar: ' + error.message)
    }
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
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportarMedicosExcel} className="btn btn-secondary">
              <FileSpreadsheet size={18} />
              Exportar Excel
            </button>
            <button onClick={handleNuevo} className="btn btn-primary">
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

                {/* Ubicación GPS - Sección desplegable */}
                {medico.latitud && medico.longitud && (
                  <div className="ubicacion-section">
                    <button
                      className="ubicacion-toggle"
                      onClick={() => toggleUbicacion(medico.id)}
                    >
                      <MapPin size={16} />
                      <span>Ubicación GPS</span>
                      {ubicacionesExpandidas[medico.id] ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {ubicacionesExpandidas[medico.id] && (
                      <div className="ubicacion-content">
                        <div className="coordenadas-info">
                          <div className="coord-item">
                            <span className="coord-label">Latitud:</span>
                            <span className="coord-value">{medico.latitud.toFixed(6)}</span>
                          </div>
                          <div className="coord-item">
                            <span className="coord-label">Longitud:</span>
                            <span className="coord-value">{medico.longitud.toFixed(6)}</span>
                          </div>
                        </div>
                        <button
                          className="btn-google-maps"
                          onClick={() => abrirEnGoogleMaps(medico.latitud, medico.longitud)}
                        >
                          <ExternalLink size={16} />
                          Abrir en Google Maps
                        </button>
                      </div>
                    )}
                  </div>
                )}

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

              {/* Sección de Ubicación GPS - Desplegable */}
              <div className="form-group ubicacion-form-section">
                <button
                  type="button"
                  className="ubicacion-form-toggle"
                  onClick={() => setShowUbicacionForm(!showUbicacionForm)}
                >
                  <MapPin size={18} />
                  <span>Ubicación GPS (Opcional)</span>
                  {showUbicacionForm ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>

                {showUbicacionForm && (
                  <div className="ubicacion-form-content">
                    <p className="ubicacion-hint">
                      Guarda la ubicación exacta del consultorio para facilitar la navegación
                    </p>

                    {formData.latitud && formData.longitud ? (
                      <div className="ubicacion-preview">
                        <div className="coordenadas-display">
                          <div className="coord-display-item">
                            <span className="coord-display-label">Latitud:</span>
                            <span className="coord-display-value">{formData.latitud.toFixed(6)}</span>
                          </div>
                          <div className="coord-display-item">
                            <span className="coord-display-label">Longitud:</span>
                            <span className="coord-display-value">{formData.longitud.toFixed(6)}</span>
                          </div>
                        </div>
                        <div className="ubicacion-buttons">
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={() => abrirEnGoogleMaps(formData.latitud, formData.longitud)}
                          >
                            <ExternalLink size={14} />
                            Ver en Mapa
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            onClick={limpiarUbicacion}
                          >
                            <X size={14} />
                            Limpiar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-capturar-gps"
                        onClick={capturarUbicacion}
                        disabled={capturandoGPS}
                      >
                        <Navigation size={18} />
                        {capturandoGPS ? 'Obteniendo ubicación...' : 'Capturar Mi Ubicación'}
                      </button>
                    )}
                  </div>
                )}
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
