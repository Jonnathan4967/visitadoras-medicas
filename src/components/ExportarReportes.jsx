import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './ExportarReportes.css'

export default function ExportarReportes({ tipo = 'visitadora' }) {
  const user = useAuthStore(state => state.user)
  const [loading, setLoading] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [visitadoraId, setVisitadoraId] = useState('')
  const [visitadoras, setVisitadoras] = useState([])

  // Cargar visitadoras si es admin
  useEffect(() => {
    if (tipo === 'admin') {
      loadVisitadoras()
    }
  }, [tipo])

  const loadVisitadoras = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, email')
      .eq('role', 'visitadora')
      .eq('activo', true)
      .order('nombre')
    
    if (data) setVisitadoras(data)
  }

  const exportarExcel = async () => {
    setLoading(true)
    try {
      const datos = await obtenerDatos()
      
      // Crear libro de Excel
      const wb = XLSX.utils.book_new()
      
      // Hoja de Visitas
      if (datos.visitas.length > 0) {
        const visitasData = datos.visitas.map(v => ({
          'Fecha': new Date(v.created_at).toLocaleDateString('es-ES'),
          'Hora': new Date(v.created_at).toLocaleTimeString('es-ES'),
          'Cliente': v.nombre_cliente,
          'Dirección': v.direccion,
          'Tipo': v.tipo_establecimiento || '',
          'Observaciones': v.observaciones || 'Sin observaciones',
          'Latitud': v.latitud || '',
          'Longitud': v.longitud || ''
        }))
        
        const wsVisitas = XLSX.utils.json_to_sheet(visitasData)
        XLSX.utils.book_append_sheet(wb, wsVisitas, 'Visitas')
      }
      
      // Hoja de Comisiones
      if (datos.comisiones.length > 0) {
        const comisionesData = datos.comisiones.map(c => ({
          'Mes': getMesNombre(c.mes),
          'Año': c.anio,
          'Visitas': c.total_visitas,
          'Comisión': `Q${c.monto_comision.toFixed(2)}`,
          'Pagado': `Q${(c.monto_pagado || 0).toFixed(2)}`,
          'Estado': c.estado === 'pagado' ? 'Pagado' : 'Pendiente',
          'Fecha de Pago': c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-ES') : ''
        }))
        
        const wsComisiones = XLSX.utils.json_to_sheet(comisionesData)
        XLSX.utils.book_append_sheet(wb, wsComisiones, 'Comisiones')
      }
      
      // Descargar archivo
      const fileName = `reporte_${fechaInicio || 'todo'}_${fechaFin || 'hoy'}.xlsx`
      XLSX.writeFile(wb, fileName)
      
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const exportarPDF = async () => {
    setLoading(true)
    try {
      const datos = await obtenerDatos()
      const doc = new jsPDF()
      
      // Título
      doc.setFontSize(18)
      doc.setTextColor(59, 130, 246)
      doc.text('Reporte de Visitas Médicas', 14, 20)
      
      // Línea decorativa
      doc.setDrawColor(59, 130, 246)
      doc.setLineWidth(0.5)
      doc.line(14, 23, 196, 23)
      
      // Información del reporte
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 30)
      if (fechaInicio || fechaFin) {
        doc.text(`Período: ${fechaInicio || 'Inicio'} a ${fechaFin || 'Hoy'}`, 14, 36)
      }
      
      let yPos = 45
      
      // ==================== VISITAS ====================
      if (datos.visitas.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(59, 130, 246)
        doc.text('Visitas Realizadas', 14, yPos)
        yPos += 3
        
        // Resumen
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Total de visitas: ${datos.visitas.length}`, 14, yPos + 3)
        yPos += 8
        
        // Tabla de Visitas - CAMBIADO "Servicios" por "Observaciones"
        const visitasRows = datos.visitas.map(v => [
          new Date(v.created_at).toLocaleDateString('es-ES'),
          new Date(v.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          v.nombre_cliente,
          v.tipo_establecimiento || 'Sin especificar',
          v.direccion.length > 30 ? v.direccion.substring(0, 30) + '...' : v.direccion,
          v.observaciones 
            ? (v.observaciones.length > 35 ? v.observaciones.substring(0, 35) + '...' : v.observaciones)
            : 'Sin observaciones'
        ])
        
        doc.autoTable({
          startY: yPos,
          head: [['Fecha', 'Hora', 'Cliente', 'Tipo', 'Dirección', 'Observaciones']],
          body: visitasRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 22 },  // Fecha
            1: { cellWidth: 18 },  // Hora
            2: { cellWidth: 35 },  // Cliente
            3: { cellWidth: 28 },  // Tipo
            4: { cellWidth: 35 },  // Dirección
            5: { cellWidth: 50 }   // Observaciones
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250]
          }
        })
        
        yPos = doc.lastAutoTable.finalY + 15
      }
      
      // ==================== COMISIONES ====================
      if (datos.comisiones.length > 0) {
        // Nueva página si es necesario
        if (yPos > 240) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(14)
        doc.setTextColor(16, 185, 129)
        doc.text('Comisiones', 14, yPos)
        yPos += 3
        
        // Resumen de comisiones
        const totalComisiones = datos.comisiones.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
        const totalPagado = datos.comisiones.reduce((sum, c) => sum + parseFloat(c.monto_pagado || 0), 0)
        const pendiente = totalComisiones - totalPagado
        
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Total comisiones: Q${totalComisiones.toFixed(2)}`, 14, yPos + 3)
        doc.text(`Pagado: Q${totalPagado.toFixed(2)}`, 70, yPos + 3)
        doc.text(`Pendiente: Q${pendiente.toFixed(2)}`, 120, yPos + 3)
        yPos += 10
        
        const comisionesRows = datos.comisiones.map(c => [
          `${getMesNombre(c.mes)} ${c.anio}`,
          c.total_visitas.toString(),
          `Q${c.monto_comision.toFixed(2)}`,
          `Q${(c.monto_pagado || 0).toFixed(2)}`,
          c.estado === 'pagado' ? 'Pagado' : 'Pendiente',
          c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-ES') : '-'
        ])
        
        doc.autoTable({
          startY: yPos,
          head: [['Período', 'Visitas', 'Comisión', 'Pagado', 'Estado', 'Fecha Pago']],
          body: comisionesRows,
          theme: 'striped',
          headStyles: { 
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 35 },  // Período
            1: { cellWidth: 20, halign: 'center' },  // Visitas
            2: { cellWidth: 30 },  // Comisión
            3: { cellWidth: 30 },  // Pagado
            4: { cellWidth: 25, halign: 'center' },  // Estado
            5: { cellWidth: 28 }   // Fecha Pago
          },
          alternateRowStyles: {
            fillColor: [236, 253, 245]
          }
        })
      }
      
      // Pie de página en todas las páginas
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString('es-ES')}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }
      
      // Descargar PDF
      const fileName = `reporte_visitas_${fechaInicio || 'todo'}_${fechaFin || new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const obtenerDatos = async () => {
    const userId = tipo === 'admin' && visitadoraId ? visitadoraId : user.id
    
    let queryVisitas = supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', userId)
      .order('created_at', { ascending: false })
    
    // Aplicar filtros de fecha
    if (fechaInicio) {
      queryVisitas = queryVisitas.gte('created_at', `${fechaInicio}T00:00:00`)
    }
    if (fechaFin) {
      queryVisitas = queryVisitas.lte('created_at', `${fechaFin}T23:59:59`)
    }
    
    const { data: visitas } = await queryVisitas
    
    // Obtener comisiones
    const { data: comisiones } = await supabase
      .from('comisiones')
      .select('*')
      .eq('visitadora_id', userId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
    
    return {
      visitas: visitas || [],
      comisiones: comisiones || []
    }
  }

  const getMesNombre = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[mes - 1]
  }

  return (
    <div className="exportar-reportes">
      <div className="export-header">
        <div>
          <h3>Exportar Reportes</h3>
          <p>Descarga tus visitas y comisiones en Excel o PDF</p>
        </div>
        <Download size={24} color="#3b82f6" />
      </div>

      <div className="export-filters">
        {tipo === 'admin' && (
          <div className="filter-group">
            <label>Visitadora</label>
            <select 
              className="input"
              value={visitadoraId}
              onChange={(e) => setVisitadoraId(e.target.value)}
            >
              <option value="">Todas las visitadoras</option>
              {visitadoras.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nombre || v.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>
            <Calendar size={14} />
            Fecha Inicio
          </label>
          <input
            type="date"
            className="input"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>
            <Calendar size={14} />
            Fecha Fin
          </label>
          <input
            type="date"
            className="input"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      <div className="export-actions">
        <button
          onClick={exportarExcel}
          className="btn btn-success"
          disabled={loading}
        >
          <FileSpreadsheet size={20} />
          {loading ? 'Generando...' : 'Exportar a Excel'}
        </button>

        <button
          onClick={exportarPDF}
          className="btn btn-primary"
          disabled={loading}
        >
          <FileText size={20} />
          {loading ? 'Generando...' : 'Exportar a PDF'}
        </button>
      </div>

      <div className="export-info">
        <p>📊 El reporte incluirá:</p>
        <ul>
          <li>✅ Todas las visitas con detalles completos</li>
          <li>✅ Historial de comisiones</li>
          <li>✅ Información de GPS y ubicaciones</li>
        </ul>
      </div>
    </div>
  )
}