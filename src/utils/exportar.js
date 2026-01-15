import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Exportar Visitas a Excel
export const exportarVisitasExcel = (visitas, nombreArchivo = 'visitas') => {
  // Preparar datos
  const datos = visitas.map(v => ({
    'Fecha': new Date(v.created_at).toLocaleDateString('es-ES'),
    'Cliente': v.nombre_cliente,
    'Dirección': v.direccion,
    'Tipo': v.tipo_establecimiento || '-',
    'Servicios': v.productos_presentados ? v.productos_presentados.join(', ') : '-',
    'Observaciones': v.observaciones || '-',
    'Latitud': v.latitud || '-',
    'Longitud': v.longitud || '-'
  }))

  // Crear libro de Excel
  const worksheet = XLSX.utils.json_to_sheet(datos)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitas')

  // Ajustar ancho de columnas
  const maxWidth = datos.reduce((w, r) => Math.max(w, r.Cliente.length), 10)
  worksheet['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: maxWidth }, // Cliente
    { wch: 30 }, // Dirección
    { wch: 20 }, // Tipo
    { wch: 30 }, // Servicios
    { wch: 30 }, // Observaciones
    { wch: 12 }, // Latitud
    { wch: 12 }  // Longitud
  ]

  // Descargar archivo
  XLSX.writeFile(workbook, `${nombreArchivo}_${Date.now()}.xlsx`)
}

// Exportar Visitas a PDF
export const exportarVisitasPDF = (visitas, nombreArchivo = 'visitas', nombreVisitadora = '') => {
  const doc = new jsPDF()

  // Título
  doc.setFontSize(18)
  doc.text('Reporte de Visitas', 14, 20)

  if (nombreVisitadora) {
    doc.setFontSize(12)
    doc.text(`Visitadora: ${nombreVisitadora}`, 14, 28)
  }

  doc.setFontSize(10)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 35)
  doc.text(`Total de visitas: ${visitas.length}`, 14, 41)

  // Preparar datos para la tabla
  const datos = visitas.map(v => [
    new Date(v.created_at).toLocaleDateString('es-ES'),
    v.nombre_cliente,
    v.direccion,
    v.tipo_establecimiento || '-',
    v.productos_presentados ? v.productos_presentados.join(', ') : '-'
  ])

  // Crear tabla
  doc.autoTable({
    startY: 48,
    head: [['Fecha', 'Cliente', 'Dirección', 'Tipo', 'Servicios']],
    body: datos,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 45 },
      3: { cellWidth: 30 },
      4: { cellWidth: 45 }
    }
  })

  // Descargar PDF
  doc.save(`${nombreArchivo}_${Date.now()}.pdf`)
}

// Exportar Comisiones a Excel
export const exportarComisionesExcel = (comisiones, nombreArchivo = 'comisiones') => {
  const datos = comisiones.map(c => ({
    'Visitadora': c.profiles?.nombre || c.profiles?.email || '-',
    'Mes': getMesNombre(c.mes),
    'Año': c.anio,
    'Visitas': c.total_visitas,
    'Comisión': `Q ${c.monto_comision.toFixed(2)}`,
    'Pagado': `Q ${(c.monto_pagado || 0).toFixed(2)}`,
    'Estado': c.estado === 'pagado' ? 'Pagado' : 'Pendiente',
    'Fecha Pago': c.fecha_pago ? new Date(c.fecha_pago).toLocaleDateString('es-ES') : '-'
  }))

  const worksheet = XLSX.utils.json_to_sheet(datos)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Comisiones')

  worksheet['!cols'] = [
    { wch: 25 }, // Visitadora
    { wch: 12 }, // Mes
    { wch: 8 },  // Año
    { wch: 10 }, // Visitas
    { wch: 15 }, // Comisión
    { wch: 15 }, // Pagado
    { wch: 12 }, // Estado
    { wch: 15 }  // Fecha Pago
  ]

  XLSX.writeFile(workbook, `${nombreArchivo}_${Date.now()}.xlsx`)
}

// Exportar Comisiones a PDF
export const exportarComisionesPDF = (comisiones, nombreArchivo = 'comisiones') => {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('Reporte de Comisiones', 14, 20)

  doc.setFontSize(10)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 28)
  doc.text(`Total de registros: ${comisiones.length}`, 14, 34)

  const datos = comisiones.map(c => [
    c.profiles?.nombre || c.profiles?.email || '-',
    `${getMesNombre(c.mes)} ${c.anio}`,
    c.total_visitas,
    `Q ${c.monto_comision.toFixed(2)}`,
    c.estado === 'pagado' ? 'Pagado' : 'Pendiente'
  ])

  doc.autoTable({
    startY: 40,
    head: [['Visitadora', 'Período', 'Visitas', 'Comisión', 'Estado']],
    body: datos,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 }
    }
  })

  doc.save(`${nombreArchivo}_${Date.now()}.pdf`)
}

// Función auxiliar para nombres de meses
const getMesNombre = (mes) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[mes - 1]
}