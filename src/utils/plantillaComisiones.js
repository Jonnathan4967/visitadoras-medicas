import * as XLSX from 'xlsx'

export const descargarPlantillaComisiones = () => {
  // Crear datos de ejemplo
  const plantilla = [
    {
      'Nombre del Médico/Establecimiento': 'DR. EJEMPLO UNO',
      'Comisión USG': 100.00,
      'Comisión Especial': 50.00,
      'Comisión EKG/PAP/LABS': 25.00
    },
    {
      'Nombre del Médico/Establecimiento': 'DRA. EJEMPLO DOS',
      'Comisión USG': 75.50,
      'Comisión Especial': 0.00,
      'Comisión EKG/PAP/LABS': 15.00
    },
    {
      'Nombre del Médico/Establecimiento': 'CLINICA EJEMPLO',
      'Comisión USG': 200.00,
      'Comisión Especial': 100.00,
      'Comisión EKG/PAP/LABS': 50.00
    }
  ]

  // Crear workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(plantilla)

  // Ajustar anchos de columna
  ws['!cols'] = [
    { wch: 40 }, // Nombre
    { wch: 15 }, // USG
    { wch: 18 }, // Especial
    { wch: 25 }  // EKG
  ]

  // Agregar hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Comisiones')

  // Agregar hoja de instrucciones
  const instrucciones = [
    ['INSTRUCCIONES PARA USAR ESTA PLANTILLA'],
    [''],
    ['1. Llena la columna "Nombre del Médico/Establecimiento" con el nombre completo'],
    ['2. Llena las 3 columnas de comisiones con los montos correspondientes'],
    ['3. Si una comisión es 0, puedes dejarlo en blanco o poner 0'],
    ['4. NO cambies los nombres de las columnas'],
    ['5. Elimina las filas de ejemplo antes de subir'],
    ['6. Guarda el archivo y súbelo en el sistema'],
    [''],
    ['NOTAS:'],
    ['- Solo se importarán médicos con comisión total mayor a Q0'],
    ['- Los nombres deben coincidir con la base de datos para mejor seguimiento'],
    ['- El sistema calcula automáticamente el total']
  ]

  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
  wsInstrucciones['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')

  // Obtener mes y año actual
  const fecha = new Date()
  const mes = fecha.toLocaleDateString('es-GT', { month: 'long' })
  const anio = fecha.getFullYear()

  // Descargar archivo
  const fileName = `Plantilla_Comisiones_${mes}_${anio}.xlsx`
  XLSX.writeFile(wb, fileName)
}