import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'
import { Download, FileSpreadsheet, FileText, Calendar, DollarSign } from 'lucide-react'
import ExcelJS from 'exceljs'
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
      
      // Obtener info de la visitadora
      const userId = tipo === 'admin' && visitadoraId ? visitadoraId : user.id
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, email')
        .eq('id', userId)
        .single()
      
      const nombreVisitadora = perfil?.nombre || perfil?.email || 'Visitadora'
      const fechaGeneracion = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      
      // Crear workbook con ExcelJS
      const workbook = new ExcelJS.Workbook()
      
      // ==================== HOJA DE VISITAS ====================
      if (datos.visitas.length > 0) {
        const worksheet = workbook.addWorksheet('Visitas')
        
        // ENCABEZADO - Fila 1: Título
        worksheet.mergeCells('A1:H1')
        const titleCell = worksheet.getCell('A1')
        titleCell.value = 'REPORTE DE VISITAS MÉDICAS'
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        worksheet.getRow(1).height = 30
        
        // Fila 2: Separador
        worksheet.mergeCells('A2:H2')
        worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
        worksheet.getRow(2).height = 8
        
        // Fila 3: Fecha de generación
        worksheet.mergeCells('A3:H3')
        const fechaCell = worksheet.getCell('A3')
        fechaCell.value = `Fecha de generación: ${fechaGeneracion}`
        fechaCell.font = { name: 'Arial', size: 11, bold: true }
        fechaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
        fechaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        worksheet.getRow(3).height = 20
        
        // Fila 4: Visitadora
        worksheet.mergeCells('A4:H4')
        const visitadoraCell = worksheet.getCell('A4')
        visitadoraCell.value = `Visitadora: ${nombreVisitadora}`
        visitadoraCell.font = { name: 'Arial', size: 11, bold: true }
        visitadoraCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } }
        visitadoraCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        worksheet.getRow(4).height = 20
        
        // Aplicar bordes al encabezado (A1:H4)
        for (let row = 1; row <= 4; row++) {
          for (let col = 1; col <= 8; col++) {
            const cell = worksheet.getCell(row, col)
            cell.border = {
              top: { style: row === 1 ? 'medium' : 'thin', color: { argb: 'FF1565C0' } },
              bottom: { style: row === 4 ? 'medium' : 'thin', color: { argb: 'FF1565C0' } },
              left: { style: col === 1 ? 'medium' : 'thin', color: { argb: 'FF1565C0' } },
              right: { style: col === 8 ? 'medium' : 'thin', color: { argb: 'FF1565C0' } }
            }
          }
        }
        
        // Fila 7: ENCABEZADOS DE TABLA
        const headers = ['Fecha', 'Hora', 'Médico', 'Clínica', 'Municipio', 'Tipo', 'Observaciones', 'Firma']
        const headerRow = worksheet.getRow(7)
        headers.forEach((header, idx) => {
          const cell = headerRow.getCell(idx + 1)
          cell.value = header
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } }
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
        datos.visitas.forEach((visita, idx) => {
          const row = worksheet.getRow(8 + idx)
          const isEven = idx % 2 === 0
          
          row.getCell(1).value = new Date(visita.created_at).toLocaleDateString('es-ES')
          row.getCell(2).value = new Date(visita.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          row.getCell(3).value = visita.nombre_cliente
          row.getCell(4).value = visita.direccion
          row.getCell(5).value = visita.municipio || ''
          row.getCell(6).value = visita.tipo_establecimiento || ''
          row.getCell(7).value = visita.observaciones || 'Sin observaciones'
          row.getCell(8).value = visita.firma_url ? 'Sí' : 'No'
          
          // Aplicar estilos
          for (let col = 1; col <= 8; col++) {
            const cell = row.getCell(col)
            cell.font = { name: 'Arial', size: 10 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF5F5F5' } }
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
        worksheet.getColumn(1).width = 12  // Fecha
        worksheet.getColumn(2).width = 10  // Hora
        worksheet.getColumn(3).width = 25  // Médico
        worksheet.getColumn(4).width = 25  // Clínica
        worksheet.getColumn(5).width = 15  // Municipio
        worksheet.getColumn(6).width = 20  // Tipo
        worksheet.getColumn(7).width = 35  // Observaciones
        worksheet.getColumn(8).width = 12  // Firma
      }
      
      // ==================== HOJA DE COMISIONES ====================
      if (datos.comisiones.length > 0) {
        const worksheet = workbook.addWorksheet('Comisiones')
        
        // ENCABEZADO
        worksheet.mergeCells('A1:H1')
        const titleCell = worksheet.getCell('A1')
        titleCell.value = 'REPORTE DE COMISIONES'
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        worksheet.getRow(1).height = 30
        
        worksheet.mergeCells('A2:H2')
        worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
        worksheet.getRow(2).height = 8
        
        worksheet.mergeCells('A3:H3')
        const fechaCell = worksheet.getCell('A3')
        fechaCell.value = `Fecha de generación: ${fechaGeneracion}`
        fechaCell.font = { name: 'Arial', size: 11, bold: true }
        fechaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
        fechaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        worksheet.getRow(3).height = 20
        
        worksheet.mergeCells('A4:H4')
        const visitadoraCell = worksheet.getCell('A4')
        visitadoraCell.value = `Visitadora: ${nombreVisitadora}`
        visitadoraCell.font = { name: 'Arial', size: 11, bold: true }
        visitadoraCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
        visitadoraCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        worksheet.getRow(4).height = 20
        
        // Bordes del encabezado
        for (let row = 1; row <= 4; row++) {
          for (let col = 1; col <= 8; col++) {
            const cell = worksheet.getCell(row, col)
            cell.border = {
              top: { style: row === 1 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } },
              bottom: { style: row === 4 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } },
              left: { style: col === 1 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } },
              right: { style: col === 8 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } }
            }
          }
        }
        
        // Calcular totales
        const totalComisiones = datos.comisiones.reduce((sum, c) => 
          sum + parseFloat(c.comision_usg || 0) + parseFloat(c.comision_especial || 0) + parseFloat(c.comision_ekg || 0), 0)
        const totalPagado = datos.comisiones.filter(c => c.estado === 'pagado').reduce((sum, c) => 
          sum + parseFloat(c.comision_usg || 0) + parseFloat(c.comision_especial || 0) + parseFloat(c.comision_ekg || 0), 0)
        const totalPendiente = totalComisiones - totalPagado
        
        // ENCABEZADOS DE TABLA
        const headers = ['Médico', 'Mes', 'Año', 'USG', 'Especial', 'EKG/PAP/LABS', 'Total', 'Estado']
        const headerRow = worksheet.getRow(7)
        headers.forEach((header, idx) => {
          const cell = headerRow.getCell(idx + 1)
          cell.value = header
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
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
        datos.comisiones.forEach((comision, idx) => {
          const row = worksheet.getRow(8 + idx)
          const isEven = idx % 2 === 0
          const total = parseFloat(comision.comision_usg || 0) + parseFloat(comision.comision_especial || 0) + parseFloat(comision.comision_ekg || 0)
          
          row.getCell(1).value = comision.nombre_medico
          row.getCell(2).value = getMesNombre(comision.mes)
          row.getCell(3).value = comision.anio
          row.getCell(4).value = parseFloat(comision.comision_usg || 0)
          row.getCell(5).value = parseFloat(comision.comision_especial || 0)
          row.getCell(6).value = parseFloat(comision.comision_ekg || 0)
          row.getCell(7).value = total
          row.getCell(8).value = comision.estado === 'pagado' ? '✓ Pagado' : '○ Pendiente'
          
          // Formato moneda para columnas 4-7
          for (let col = 4; col <= 7; col++) {
            row.getCell(col).numFmt = 'Q #,##0.00'
          }
          
          // Aplicar estilos
          for (let col = 1; col <= 8; col++) {
            const cell = row.getCell(col)
            cell.font = { name: 'Arial', size: 10 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF1F8E9' } }
            cell.alignment = { vertical: 'middle', horizontal: col >= 4 && col <= 7 ? 'right' : 'left' }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            }
          }
        })
        
        // FILA DE TOTALES
        const totalRow = worksheet.getRow(8 + datos.comisiones.length)
        totalRow.getCell(1).value = 'TOTALES:'
        totalRow.getCell(7).value = totalComisiones
        totalRow.getCell(7).numFmt = 'Q #,##0.00'
        
        for (let col = 1; col <= 8; col++) {
          const cell = totalRow.getCell(col)
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } }
          cell.alignment = { vertical: 'middle', horizontal: col === 7 ? 'right' : 'center' }
          cell.border = {
            top: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          }
        }
        totalRow.height = 28
        
        // Ajustar columnas
        worksheet.getColumn(1).width = 30
        worksheet.getColumn(2).width = 12
        worksheet.getColumn(3).width = 8
        worksheet.getColumn(4).width = 12
        worksheet.getColumn(5).width = 12
        worksheet.getColumn(6).width = 15
        worksheet.getColumn(7).width = 12
        worksheet.getColumn(8).width = 15
      }
      
      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fechaActual = new Date().toLocaleDateString('es-ES').replace(/\//g, '-')
      link.download = `Reporte_${nombreVisitadora.replace(/\s+/g, '_')}_${fechaActual}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      
      alert('✅ Reporte generado exitosamente')
      
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al generar el reporte: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  const exportarPDF = async () => {
    setLoading(true)
    try {
      const datos = await obtenerDatos()
      
      // Obtener info de la visitadora
      const userId = tipo === 'admin' && visitadoraId ? visitadoraId : user.id
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, email')
        .eq('id', userId)
        .single()
      
      const nombreVisitadora = perfil?.nombre || perfil?.email || 'Visitadora'
      
      const doc = new jsPDF()
      
      // ==================== ENCABEZADO PROFESIONAL ====================
      // Fondo azul para el encabezado
      doc.setFillColor(30, 58, 138) // Azul oscuro
      doc.rect(0, 0, 210, 45, 'F')
      
      // Título principal
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('REPORTE DE VISITAS MÉDICAS', 105, 20, { align: 'center' })
      
      // Línea decorativa blanca
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.5)
      doc.line(20, 25, 190, 25)
      
      // Información del reporte
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, 105, 32, { align: 'center' })
      
      doc.setFont('helvetica', 'bold')
      doc.text(`Visitadora: ${nombreVisitadora}`, 105, 39, { align: 'center' })
      
      let yPos = 55
      
      // ==================== VISITAS ====================
      if (datos.visitas.length > 0) {
        // Sección header
        doc.setFillColor(59, 130, 246) // Azul
        doc.rect(14, yPos - 5, 182, 8, 'F')
        
        doc.setFontSize(14)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('VISITAS REALIZADAS', 16, yPos)
        
        // Contador
        doc.setFontSize(10)
        doc.text(`Total: ${datos.visitas.length}`, 180, yPos, { align: 'right' })
        
        yPos += 8
        
        // Tabla de Visitas
        const visitasRows = datos.visitas.map(v => [
          new Date(v.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          new Date(v.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          v.nombre_cliente,
          v.tipo_establecimiento || 'N/A',
          v.direccion.length > 25 ? v.direccion.substring(0, 25) + '...' : v.direccion,
          v.observaciones 
            ? (v.observaciones.length > 30 ? v.observaciones.substring(0, 30) + '...' : v.observaciones)
            : '-'
        ])
        
        doc.autoTable({
          startY: yPos,
          head: [['Fecha', 'Hora', 'Médico', 'Tipo', 'Dirección', 'Observaciones']],
          body: visitasRows,
          theme: 'grid',
          headStyles: { 
            fillColor: [37, 99, 235], // Azul más oscuro
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
          },
          styles: { 
            fontSize: 8,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { cellWidth: 22, halign: 'center' },
            1: { cellWidth: 16, halign: 'center' },
            2: { cellWidth: 32 },
            3: { cellWidth: 24, halign: 'center' },
            4: { cellWidth: 35 },
            5: { cellWidth: 40 }
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          margin: { left: 14, right: 14 }
        })
        
        yPos = doc.lastAutoTable.finalY + 12
        
        // ==================== FIRMAS DE VISITAS ====================
        // Agregar página de firmas si hay visitas con firma
        const visitasConFirma = datos.visitas.filter(v => v.firma_url)
        
        if (visitasConFirma.length > 0) {
          doc.addPage()
          yPos = 20
          
          // Header de firmas
          doc.setFillColor(99, 102, 241) // Índigo
          doc.rect(14, yPos - 5, 182, 8, 'F')
          
          doc.setFontSize(14)
          doc.setTextColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
          doc.text('FIRMAS DE CLIENTES', 16, yPos)
          
          doc.setFontSize(10)
          doc.text(`${visitasConFirma.length} firmas`, 180, yPos, { align: 'right' })
          
          yPos += 15
          
          // Mostrar firmas (máximo 3 por página)
          let firmasEnPagina = 0
          
          for (const visita of visitasConFirma) {
            if (firmasEnPagina >= 3) {
              doc.addPage()
              yPos = 20
              firmasEnPagina = 0
            }
            
            try {
              // Crear box para la firma
              doc.setDrawColor(200, 200, 200)
              doc.setLineWidth(0.5)
              doc.rect(14, yPos, 182, 65)
              
              // Info de la visita
              doc.setFontSize(10)
              doc.setTextColor(0, 0, 0)
              doc.setFont('helvetica', 'bold')
              doc.text(visita.nombre_cliente, 18, yPos + 6)
              
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(8)
              doc.setTextColor(100, 100, 100)
              doc.text(
                `${new Date(visita.created_at).toLocaleDateString('es-ES')} - ${visita.direccion}`,
                18,
                yPos + 11
              )
              
              // Cargar y agregar firma
              const img = new Image()
              img.crossOrigin = 'anonymous'
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  // Agregar firma centrada
                  const imgWidth = 80
                  const imgHeight = 40
                  const xPos = 105 - (imgWidth / 2)
                  const yPosImg = yPos + 18
                  
                  doc.addImage(img, 'PNG', xPos, yPosImg, imgWidth, imgHeight)
                  resolve()
                }
                img.onerror = () => {
                  // Si falla, mostrar texto
                  doc.setFontSize(9)
                  doc.setTextColor(150, 150, 150)
                  doc.text('Firma no disponible', 105, yPos + 35, { align: 'center' })
                  resolve()
                }
                img.src = visita.firma_url
              })
              
              yPos += 70
              firmasEnPagina++
              
            } catch (error) {
              console.error('Error al cargar firma:', error)
            }
          }
        }
      }
      
      // ==================== COMISIONES ====================
      if (datos.comisiones.length > 0) {
        // Nueva página
        doc.addPage()
        yPos = 20
        
        // Header de comisiones
        doc.setFillColor(16, 185, 129) // Verde
        doc.rect(14, yPos - 5, 182, 8, 'F')
        
        doc.setFontSize(14)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('COMISIONES', 16, yPos)
        
        yPos += 8
        
        // Resumen de comisiones
        const totalComisiones = datos.comisiones.reduce((sum, c) => sum + parseFloat(c.monto_comision || 0), 0)
        const totalPagado = datos.comisiones.reduce((sum, c) => sum + parseFloat(c.monto_pagado || 0), 0)
        const pendiente = totalComisiones - totalPagado
        
        // Boxes de resumen
        doc.setFillColor(236, 253, 245)
        doc.rect(14, yPos, 60, 15, 'F')
        doc.setDrawColor(16, 185, 129)
        doc.rect(14, yPos, 60, 15)
        
        doc.setFillColor(254, 243, 199)
        doc.rect(76, yPos, 60, 15, 'F')
        doc.setDrawColor(245, 158, 11)
        doc.rect(76, yPos, 60, 15)
        
        doc.setFillColor(219, 234, 254)
        doc.rect(138, yPos, 58, 15, 'F')
        doc.setDrawColor(59, 130, 246)
        doc.rect(138, yPos, 58, 15)
        
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text('Total Comisiones', 44, yPos + 5, { align: 'center' })
        doc.text('Pagado', 106, yPos + 5, { align: 'center' })
        doc.text('Pendiente', 167, yPos + 5, { align: 'center' })
        
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(16, 185, 129)
        doc.text(`Q${totalComisiones.toFixed(2)}`, 44, yPos + 11, { align: 'center' })
        doc.setTextColor(245, 158, 11)
        doc.text(`Q${totalPagado.toFixed(2)}`, 106, yPos + 11, { align: 'center' })
        doc.setTextColor(59, 130, 246)
        doc.text(`Q${pendiente.toFixed(2)}`, 167, yPos + 11, { align: 'center' })
        
        yPos += 20
        
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
          theme: 'grid',
          headStyles: { 
            fillColor: [5, 150, 105],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
          },
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
          },
          columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 25, halign: 'center' },
            5: { cellWidth: 28, halign: 'center' }
          },
          alternateRowStyles: {
            fillColor: [240, 253, 244]
          },
          margin: { left: 14, right: 14 }
        })
      }
      
      // ==================== PIE DE PÁGINA ====================
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        
        // Línea superior
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(14, doc.internal.pageSize.height - 15, 196, doc.internal.pageSize.height - 15)
        
        // Texto del pie
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Sistema de Gestión de Visitadoras Médicas`,
          14,
          doc.internal.pageSize.height - 10
        )
        doc.text(
          `Página ${i} de ${pageCount}`,
          196,
          doc.internal.pageSize.height - 10,
          { align: 'right' }
        )
      }
      
      // Descargar PDF
      const fechaActual = new Date().toLocaleDateString('es-ES').replace(/\//g, '-')
      const fileName = `Reporte_${nombreVisitadora.replace(/\s+/g, '_')}_${fechaActual}.pdf`
      doc.save(fileName)
      
      alert('✅ PDF generado exitosamente')
      
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Error al generar el PDF')
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
    
    // Obtener comisiones mensuales
    const { data: comisiones } = await supabase
      .from('comisiones_mensuales')
      .select('*')
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })
    
    return {
      visitas: visitas || [],
      comisiones: comisiones || []
    }
  }

  const exportarComisionesExcel = async () => {
    setLoading(true)
    try {
      const datos = await obtenerDatos()
      
      if (datos.comisiones.length === 0) {
        alert('No hay comisiones para exportar')
        setLoading(false)
        return
      }
      
      const userId = tipo === 'admin' && visitadoraId ? visitadoraId : user.id
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, email')
        .eq('id', userId)
        .single()
      
      const nombreVisitadora = perfil?.nombre || perfil?.email || 'Visitadora'
      const fechaGeneracion = new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      })
      
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Comisiones')
      
      // ENCABEZADO
      worksheet.mergeCells('A1:H1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = 'REPORTE DE COMISIONES'
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      worksheet.getRow(1).height = 30
      
      worksheet.mergeCells('A2:H2')
      worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
      worksheet.getRow(2).height = 8
      
      worksheet.mergeCells('A3:H3')
      const fechaCell = worksheet.getCell('A3')
      fechaCell.value = `Fecha de generación: ${fechaGeneracion}`
      fechaCell.font = { name: 'Arial', size: 11, bold: true }
      fechaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
      fechaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      worksheet.getRow(3).height = 20
      
      worksheet.mergeCells('A4:H4')
      const visitadoraCell = worksheet.getCell('A4')
      visitadoraCell.value = `Visitadora: ${nombreVisitadora}`
      visitadoraCell.font = { name: 'Arial', size: 11, bold: true }
      visitadoraCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
      visitadoraCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      worksheet.getRow(4).height = 20
      
      // Bordes
      for (let row = 1; row <= 4; row++) {
        for (let col = 1; col <= 8; col++) {
          const cell = worksheet.getCell(row, col)
          cell.border = {
            top: { style: row === 1 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } },
            bottom: { style: row === 4 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } },
            left: { style: col === 1 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } },
            right: { style: col === 8 ? 'medium' : 'thin', color: { argb: 'FF2E7D32' } }
          }
        }
      }
      
      // Totales
      const totalComisiones = datos.comisiones.reduce((sum, c) => 
        sum + parseFloat(c.comision_usg || 0) + parseFloat(c.comision_especial || 0) + parseFloat(c.comision_ekg || 0), 0)
      const totalPagado = datos.comisiones.filter(c => c.estado === 'pagado').reduce((sum, c) => 
        sum + parseFloat(c.comision_usg || 0) + parseFloat(c.comision_especial || 0) + parseFloat(c.comision_ekg || 0), 0)
      
      // ENCABEZADOS TABLA
      const headers = ['Médico', 'Mes', 'Año', 'USG', 'Especial', 'EKG/PAP/LABS', 'Total', 'Estado']
      const headerRow = worksheet.getRow(7)
      headers.forEach((header, idx) => {
        const cell = headerRow.getCell(idx + 1)
        cell.value = header
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }
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
      datos.comisiones.forEach((c, idx) => {
        const row = worksheet.getRow(8 + idx)
        const isEven = idx % 2 === 0
        const total = parseFloat(c.comision_usg || 0) + parseFloat(c.comision_especial || 0) + parseFloat(c.comision_ekg || 0)
        
        row.getCell(1).value = c.nombre_medico
        row.getCell(2).value = getMesNombre(c.mes)
        row.getCell(3).value = c.anio
        row.getCell(4).value = parseFloat(c.comision_usg || 0)
        row.getCell(5).value = parseFloat(c.comision_especial || 0)
        row.getCell(6).value = parseFloat(c.comision_ekg || 0)
        row.getCell(7).value = total
        row.getCell(8).value = c.estado === 'pagado' ? '✓ Pagado' : '○ Pendiente'
        
        for (let col = 4; col <= 7; col++) {
          row.getCell(col).numFmt = 'Q #,##0.00'
        }
        
        for (let col = 1; col <= 8; col++) {
          const cell = row.getCell(col)
          cell.font = { name: 'Arial', size: 10 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF1F8E9' } }
          cell.alignment = { vertical: 'middle', horizontal: col >= 4 && col <= 7 ? 'right' : 'left' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
          }
        }
      })
      
      // TOTALES
      const totalRow = worksheet.getRow(8 + datos.comisiones.length)
      totalRow.getCell(1).value = 'TOTALES:'
      totalRow.getCell(7).value = totalComisiones
      totalRow.getCell(7).numFmt = 'Q #,##0.00'
      
      for (let col = 1; col <= 8; col++) {
        const cell = totalRow.getCell(col)
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } }
        cell.alignment = { vertical: 'middle', horizontal: col === 7 ? 'right' : 'center' }
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        }
      }
      totalRow.height = 28
      
      worksheet.getColumn(1).width = 30
      worksheet.getColumn(2).width = 12
      worksheet.getColumn(3).width = 8
      worksheet.getColumn(4).width = 12
      worksheet.getColumn(5).width = 12
      worksheet.getColumn(6).width = 15
      worksheet.getColumn(7).width = 12
      worksheet.getColumn(8).width = 15
      
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fechaActual = new Date().toLocaleDateString('es-ES').replace(/\//g, '-')
      link.download = `Comisiones_${nombreVisitadora.replace(/\s+/g, '_')}_${fechaActual}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      
      alert('✅ Reporte de comisiones generado')
      
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar el reporte: ' + error.message)
    } finally {
      setLoading(false)
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
          {loading ? 'Generando...' : 'Exportar a Excel (Completo)'}
        </button>

        <button
          onClick={exportarPDF}
          className="btn btn-primary"
          disabled={loading}
        >
          <FileText size={20} />
          {loading ? 'Generando...' : 'Exportar a PDF (Completo)'}
        </button>
      </div>

      <div className="export-separator">
        <span>o exportar solo</span>
      </div>

      <div className="export-actions-secondary">
        <button
          onClick={exportarComisionesExcel}
          className="btn btn-secondary"
          disabled={loading}
        >
          <DollarSign size={20} />
          {loading ? 'Generando...' : 'Solo Comisiones (Excel)'}
        </button>
      </div>

      <div className="export-info">
        <p>📊 El reporte completo incluirá:</p>
        <ul>
          <li>✅ Todas las visitas con detalles completos</li>
          <li>✅ Historial de comisiones</li>
          <li>✅ Información de GPS y ubicaciones</li>
        </ul>
      </div>
    </div>
  )
}