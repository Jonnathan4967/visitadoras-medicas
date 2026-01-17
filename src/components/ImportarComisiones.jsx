import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import './ImportarComisiones.css'

export default function ImportarComisiones({ onImportExitoso, onClose }) {
  const [archivo, setArchivo] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)

  const handleArchivoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setArchivo(file)
    setError('')
    setPreview([])
    setStats(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      
      // Buscar la hoja correcta (Hoja3 o la primera)
      let sheetName = workbook.SheetNames.includes('Hoja3') 
        ? 'Hoja3' 
        : workbook.SheetNames[0]
      
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Procesar datos
      const comisionesProcesadas = []
      
      for (const row of jsonData) {
        // Buscar columnas (pueden tener nombres diferentes)
        const nombre = row['Etiquetas de fila'] || row['NOMBRE'] || row['Nombre'] || row['nombre']
        const comUsg = parseFloat(row['Suma de COMISION USG'] || row['COMISION USG'] || row['USG'] || 0)
        const comEsp = parseFloat(row['Suma de COMISION ESPECIAL'] || row['COMISION ESPECIAL'] || row['ESPECIAL'] || 0)
        const comEkg = parseFloat(row['Suma de COMISION EKG, PAP, LABS'] || row['COMISION EKG'] || row['EKG'] || 0)
        
        const total = comUsg + comEsp + comEkg

        // Solo agregar si tiene nombre y total > 0
        if (nombre && total > 0) {
          comisionesProcesadas.push({
            nombre_medico: nombre.toString().trim(),
            comision_usg: comUsg,
            comision_especial: comEsp,
            comision_ekg: comEkg,
            total: total
          })
        }
      }

      // Ordenar por total descendente
      comisionesProcesadas.sort((a, b) => b.total - a.total)

      setPreview(comisionesProcesadas)
      setStats({
        total: comisionesProcesadas.length,
        montoTotal: comisionesProcesadas.reduce((sum, c) => sum + c.total, 0)
      })

    } catch (error) {
      console.error('Error al procesar Excel:', error)
      setError('Error al procesar el archivo. Verifica que sea un Excel válido.')
    }
  }

  const handleImportar = async () => {
    if (preview.length === 0) {
      setError('No hay datos para importar')
      return
    }

    setProcesando(true)
    setError('')

    try {
      // Obtener mes y año actual
      const fecha = new Date()
      const mes = fecha.getMonth() + 1
      const anio = fecha.getFullYear()

      // Preparar datos para insertar
      const datosParaInsertar = preview.map(c => ({
        mes,
        anio,
        nombre_medico: c.nombre_medico,
        comision_usg: c.comision_usg,
        comision_especial: c.comision_especial,
        comision_ekg: c.comision_ekg,
        estado: 'pendiente'
      }))

      // Insertar en la base de datos
      const { data, error } = await supabase
        .from('comisiones_mensuales')
        .insert(datosParaInsertar)

      if (error) throw error

      alert(`✅ ${preview.length} comisiones importadas exitosamente`)
      onImportExitoso()
      
    } catch (error) {
      console.error('Error al importar:', error)
      setError('Error al importar: ' + error.message)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-importar">
        <div className="modal-header">
          <h2>Importar Comisiones del Mes</h2>
          <button onClick={onClose} className="btn-close" disabled={procesando}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Instrucciones */}
          <div className="instrucciones-import">
            <AlertCircle size={20} color="#3b82f6" />
            <div>
              <h4>Instrucciones:</h4>
              <ul>
                <li>Sube el archivo Excel con las comisiones del mes</li>
                <li>El archivo debe tener: Nombre del médico y 3 columnas de comisiones</li>
                <li>Solo se importarán registros con comisión mayor a Q0</li>
              </ul>
            </div>
          </div>

          {/* Selector de archivo */}
          <div className="upload-section">
            <label className="upload-label">
              <FileSpreadsheet size={32} />
              <span>Click para seleccionar archivo Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleArchivoChange}
                style={{ display: 'none' }}
                disabled={procesando}
              />
            </label>
            {archivo && (
              <p className="archivo-seleccionado">
                <CheckCircle size={16} color="#10b981" />
                {archivo.name}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="preview-section">
              <div className="preview-header">
                <h4>Vista Previa</h4>
                <div className="preview-stats">
                  <span>{stats.total} comisiones</span>
                  <span>Total: Q{stats.montoTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="preview-list">
                {preview.slice(0, 10).map((comision, idx) => (
                  <div key={idx} className="preview-item">
                    <div className="preview-nombre">{comision.nombre_medico}</div>
                    <div className="preview-desglose">
                      <span>USG: Q{comision.comision_usg.toFixed(2)}</span>
                      <span>ESP: Q{comision.comision_especial.toFixed(2)}</span>
                      <span>EKG: Q{comision.comision_ekg.toFixed(2)}</span>
                    </div>
                    <div className="preview-total">Q{comision.total.toFixed(2)}</div>
                  </div>
                ))}
                {preview.length > 10 && (
                  <p className="preview-mas">
                    Y {preview.length - 10} más...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            disabled={procesando}
          >
            Cancelar
          </button>
          <button 
            onClick={handleImportar}
            className="btn btn-success"
            disabled={procesando || preview.length === 0}
          >
            <Upload size={18} />
            {procesando ? 'Importando...' : `Importar ${preview.length} Comisiones`}
          </button>
        </div>
      </div>
    </div>
  )
}