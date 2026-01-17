import * as XLSX from 'xlsx'

export const exportarReporteComisiones = async (comisiones) => {
  if (!comisiones || comisiones.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  // Preparar datos para Excel
  const datosExcel = comisiones.map(c => ({
    'Mes': getMesNombre(c.mes),
    'Año': c.anio,
    'Médico/Establecimiento': c.nombre_medico,
    'Comisión USG': `Q${parseFloat(c.comision_usg || 0).toFixed(2)}`,
    'Comisión Especial': `Q${parseFloat(c.comision_especial || 0).toFixed(2)}`,
    'Comisión EKG/PAP/LABS': `Q${parseFloat(c.comision_ekg || 0).toFixed(2)}`,
    'Total': `Q${parseFloat(c.total_comision || 0).toFixed(2)}`,
    'Estado': c.estado === 'pagado' ? 'Pagado' : 'Pendiente',
    'Pagado Por': c.nombre_visitadora || '-',
    'Fecha de Pago': c.fecha_pago 
      ? new Date(c.fecha_pago).toLocaleDateString('es-GT')
      : '-',
    'Recibido Por': c.nombre_quien_recibe || '-'
  }))

  // Crear workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosExcel)

  // Ajustar anchos de columna
  ws['!cols'] = [
    { wch: 12 }, // Mes
    { wch: 8 },  // Año
    { wch: 35 }, // Médico
    { wch: 15 }, // USG
    { wch: 18 }, // Especial
    { wch: 22 }, // EKG
    { wch: 12 }, // Total
    { wch: 12 }, // Estado
    { wch: 20 }, // Pagado por
    { wch: 15 }, // Fecha
    { wch: 25 }  // Recibido por
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Comisiones')

  // Agregar hoja de resumen
  const pendientes = comisiones.filter(c => c.estado === 'pendiente')
  const pagadas = comisiones.filter(c => c.estado === 'pagado')
  
  const totalPendiente = pendientes.reduce((sum, c) => sum + parseFloat(c.total_comision || 0), 0)
  const totalPagado = pagadas.reduce((sum, c) => sum + parseFloat(c.total_comision || 0), 0)

  const resumen = [
    ['RESUMEN DE COMISIONES'],
    [''],
    ['Total de Comisiones:', comisiones.length],
    ['Comisiones Pendientes:', pendientes.length, `Q${totalPendiente.toFixed(2)}`],
    ['Comisiones Pagadas:', pagadas.length, `Q${totalPagado.toFixed(2)}`],
    ['Total General:', '', `Q${(totalPendiente + totalPagado).toFixed(2)}`],
    [''],
    ['Fecha de Generación:', new Date().toLocaleDateString('es-GT')],
    ['Hora:', new Date().toLocaleTimeString('es-GT')]
  ]

  const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
  wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // Descargar archivo
  const fecha = new Date()
  const fileName = `Reporte_Comisiones_${fecha.getFullYear()}_${fecha.getMonth()+1}_${fecha.getDate()}.xlsx`
  XLSX.writeFile(wb, fileName)
}

function getMesNombre(numeroMes) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[numeroMes - 1] || 'Desconocido'
}