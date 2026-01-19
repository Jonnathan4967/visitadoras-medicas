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

    console.log('📄 Archivo seleccionado:', file.name)
    
    setArchivo(file)
    setError('')
    setPreview([])
    setStats(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      
      console.log('📊 Hojas disponibles:', workbook.SheetNames)
      
      // Buscar la hoja correcta (Hoja3 o la primera)
      let sheetName = workbook.SheetNames.includes('Hoja3') 
        ? 'Hoja3' 
        : workbook.SheetNames[0]
      
      console.log('📑 Usando hoja:', sheetName)
      
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      console.log('📋 Datos crudos del Excel:', jsonData)
      console.log('📋 Primera fila como ejemplo:', jsonData[0])

      // Debug: Ver las columnas disponibles
      if (jsonData.length > 0) {
        console.log('🔑 Columnas disponibles en el Excel:', Object.keys(jsonData[0]))
      }

      // Procesar datos
      const comisionesProcesadas = []
      
      for (const row of jsonData) {
        // Buscar columnas (pueden tener nombres diferentes)
        const nombre = 
          row['Nombre del Médico/Establecimiento'] ||  // ⭐ Nombre correcto de la plantilla
          row['Etiquetas de fila'] || 
          row['NOMBRE'] || 
          row['Nombre'] || 
          row['nombre'] ||
          row['Medico'] ||
          row['MEDICO'] ||
          row['medico'] ||
          row['Nombre del Médico'] ||
          row['NOMBRE DEL MEDICO']
        
        const comUsg = parseFloat(
          row['Comisión USG'] ||  // ⭐ Nombre correcto de la plantilla
          row['Suma de COMISION USG'] || 
          row['COMISION USG'] || 
          row['USG'] || 
          row['comision_usg'] ||
          0
        )
        
        const comEsp = parseFloat(
          row['Comisión Especial'] ||  // ⭐ Nombre correcto de la plantilla
          row['Suma de COMISION ESPECIAL'] || 
          row['COMISION ESPECIAL'] || 
          row['ESPECIAL'] || 
          row['comision_especial'] ||
          0
        )
        
        const comEkg = parseFloat(
          row['Comisión EKG/PAP/LABS'] ||  // ⭐ Nombre correcto de la plantilla
          row['Suma de COMISION EKG, PAP, LABS'] || 
          row['COMISION EKG'] || 
          row['EKG'] || 
          row['comision_ekg'] ||
          row['COMISION EKG/PAP/LABS'] ||
          0
        )
        
        const total = comUsg + comEsp + comEkg

        console.log(`Fila: ${JSON.stringify(row)}`)
        console.log(`  → Nombre: "${nombre}", USG: ${comUsg}, ESP: ${comEsp}, EKG: ${comEkg}, Total: ${total}`)

        // Solo agregar si tiene nombre y total > 0
        if (nombre && nombre.toString().trim() !== '' && total > 0) {
          comisionesProcesadas.push({
            nombre_medico: nombre.toString().trim(),
            comision_usg: comUsg,
            comision_especial: comEsp,
            comision_ekg: comEkg,
            total: total
          })
          console.log(`  ✅ Comisión agregada`)
        } else {
          console.log(`  ❌ Fila ignorada: nombre="${nombre}", total=${total}`)
        }
      }

      console.log(`✅ ${comisionesProcesadas.length} comisiones procesadas`)

      // Ordenar por total descendente
      comisionesProcesadas.sort((a, b) => b.total - a.total)

      setPreview(comisionesProcesadas)
      setStats({
        total: comisionesProcesadas.length,
        montoTotal: comisionesProcesadas.reduce((sum, c) => sum + c.total, 0)
      })

    } catch (error) {
      console.error('❌ Error al procesar Excel:', error)
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
      console.log('🚀 Iniciando importación...')
      
      // Obtener mes y año actual
      const fecha = new Date()
      const mes = fecha.getMonth() + 1
      const anio = fecha.getFullYear()

      console.log(`📅 Mes: ${mes}, Año: ${anio}`)

      // Preparar datos para insertar
      // ⚠️ IMPORTANTE: NO incluir total_comision porque es una columna generada
      const datosParaInsertar = preview.map(c => ({
        mes,
        anio,
        nombre_medico: c.nombre_medico,
        comision_usg: c.comision_usg,
        comision_especial: c.comision_especial,
        comision_ekg: c.comision_ekg,
        // total_comision se calcula automáticamente (columna generada)
        estado: 'pendiente',
        created_at: new Date().toISOString()
      }))

      console.log('📦 Datos a insertar (sin total_comision):', datosParaInsertar.slice(0, 2))

      // Insertar en la base de datos
      const { data, error } = await supabase
        .from('comisiones_mensuales')
        .insert(datosParaInsertar)
        .select()

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }

      console.log('✅ Datos insertados:', data)
      console.log(`✅ ${data?.length || preview.length} registros insertados`)

      // Verificar que los totales se calcularon correctamente
      if (data && data.length > 0) {
        console.log('🔍 Verificando cálculo de total_comision:')
        data.slice(0, 3).forEach(item => {
          const totalCalculado = (item.comision_usg || 0) + (item.comision_especial || 0) + (item.comision_ekg || 0)
          console.log(`  ${item.nombre_medico}: total_comision=${item.total_comision}, calculado=${totalCalculado}`)
        })
      }

      alert(
        `✅ Importación exitosa\n\n` +
        `📊 Comisiones importadas: ${data?.length || preview.length}\n` +
        `💰 Total: Q${stats.montoTotal.toFixed(2)}\n` +
        `📅 Mes: ${mes}/${anio}\n\n` +
        `Los totales se calcularon automáticamente.`
      )
      
      onImportExitoso()
      
    } catch (error) {
      console.error('💥 Error al importar:', error)
      
      let mensajeError = error.message
      
      // Mensaje más claro para errores comunes
      if (error.message.includes('generated column')) {
        mensajeError = 'Error: La columna total_comision es generada automáticamente. Contacta al administrador.'
      } else if (error.message.includes('duplicate key')) {
        mensajeError = 'Error: Ya existen comisiones para este mes. Elimina las existentes primero.'
      } else if (error.message.includes('permission denied')) {
        mensajeError = 'Error: No tienes permisos para insertar comisiones.'
      }
      
      setError(mensajeError)
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
                <li><strong>Tip:</strong> Descarga la plantilla para ver el formato correcto</li>
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
              <AlertCircle size={20} />
              <div>
                <strong>Error al importar:</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="preview-section">
              <div className="preview-header">
                <h4>Vista Previa</h4>
                <div className="preview-stats">
                  <span className="badge badge-blue">{stats.total} comisiones</span>
                  <span className="badge badge-green">Total: Q{stats.montoTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="preview-list">
                {preview.slice(0, 10).map((comision, idx) => (
                  <div key={idx} className="preview-item">
                    <div className="preview-nombre">
                      <span className="preview-numero">{idx + 1}.</span>
                      {comision.nombre_medico}
                    </div>
                    <div className="preview-desglose">
                      <span>USG: Q{comision.comision_usg.toFixed(2)}</span>
                      <span>ESP: Q{comision.comision_especial.toFixed(2)}</span>
                      <span>EKG: Q{comision.comision_ekg.toFixed(2)}</span>
                    </div>
                    <div className="preview-total">
                      <strong>Q{comision.total.toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
                {preview.length > 10 && (
                  <p className="preview-mas">
                    Y {preview.length - 10} comisiones más...
                  </p>
                )}
              </div>

              {/* Resumen final */}
              <div className="preview-resumen">
                <div className="resumen-item">
                  <span className="resumen-label">Total registros:</span>
                  <span className="resumen-valor">{stats.total}</span>
                </div>
                <div className="resumen-item">
                  <span className="resumen-label">Monto total:</span>
                  <span className="resumen-valor"><strong>Q{stats.montoTotal.toFixed(2)}</strong></span>
                </div>
                <div className="resumen-item">
                  <span className="resumen-label">Mes:</span>
                  <span className="resumen-valor">
                    {new Date().toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="resumen-nota">
                  <AlertCircle size={14} />
                  <small>El total de cada comisión se calculará automáticamente</small>
                </div>
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
            {procesando ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px'
                }}></div>
                Importando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Importar {preview.length} Comisiones
              </>
            )}
          </button>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .preview-numero {
            color: #6b7280;
            font-weight: 500;
            margin-right: 8px;
          }

          .preview-resumen {
            margin-top: 16px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .resumen-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .resumen-label {
            color: #6b7280;
            font-size: 14px;
          }

          .resumen-valor {
            color: #111827;
            font-size: 14px;
          }

          .resumen-nota {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px;
            background: #dbeafe;
            border-radius: 6px;
            margin-top: 4px;
          }

          .resumen-nota small {
            color: #1e40af;
            font-size: 12px;
          }

          .badge {
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
          }

          .badge-blue {
            background: #dbeafe;
            color: #1e40af;
          }

          .badge-green {
            background: #d1fae5;
            color: #065f46;
          }

          .error-message {
            display: flex;
            gap: 12px;
            padding: 12px;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #991b1b;
          }

          .error-message strong {
            display: block;
            margin-bottom: 4px;
          }

          .error-message p {
            margin: 0;
            font-size: 14px;
          }
        `}</style>
      </div>
    </div>
  )
}