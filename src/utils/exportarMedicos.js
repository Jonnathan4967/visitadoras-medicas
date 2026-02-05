// utils/exportarMedicos.js
import * as XLSX from 'xlsx'

export const exportarMedicosAExcel = (medicos) => {
  try {
    // Formatear datos para Excel (SIN EMAIL)
    const datosFormateados = medicos.map((medico, index) => ({
      '#': index + 1,
      'Nombre Completo': medico.nombre_completo || '',
      'Especialidad': medico.especialidad || '',
      'Hospital/Clínica': medico.hospital || '',
      'Ciudad': medico.ciudad || '',
      'Teléfono': medico.telefono || '',
      'Dirección': medico.direccion || '',
      'Notas': medico.notas || ''
    }))

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()
    
    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosFormateados)

    // Ajustar ancho de columnas (SIN EMAIL)
    const colWidths = [
      { wch: 5 },   // #
      { wch: 30 },  // Nombre
      { wch: 20 },  // Especialidad
      { wch: 25 },  // Hospital
      { wch: 15 },  // Ciudad
      { wch: 15 },  // Teléfono
      { wch: 35 },  // Dirección
      { wch: 40 }   // Notas
    ]
    ws['!cols'] = colWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Médicos')

    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0]
    const nombreArchivo = `medicos_${fecha}.xlsx`

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo)

    return {
      success: true,
      message: `${medicos.length} médicos exportados correctamente`,
      filename: nombreArchivo
    }
  } catch (error) {
    console.error('Error al exportar médicos:', error)
    return {
      success: false,
      message: 'Error al exportar médicos: ' + error.message
    }
  }
}

// Función para exportar plantilla vacía (SIN EMAIL)
export const exportarPlantillaMedicos = () => {
  try {
    const plantilla = [
      {
        '#': 1,
        'Nombre Completo': 'Dr. Juan Pérez',
        'Especialidad': 'Cardiología',
        'Hospital/Clínica': 'Hospital Central',
        'Ciudad': 'Guatemala',
        'Teléfono': '555-1234',
        'Dirección': 'Calle Principal #123',
        'Notas': 'Atiende lunes a viernes'
      },
      {
        '#': 2,
        'Nombre Completo': '',
        'Especialidad': '',
        'Hospital/Clínica': '',
        'Ciudad': '',
        'Teléfono': '',
        'Dirección': '',
        'Notas': ''
      }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(plantilla)

    const colWidths = [
      { wch: 5 },   // #
      { wch: 30 },  // Nombre
      { wch: 20 },  // Especialidad
      { wch: 25 },  // Hospital
      { wch: 15 },  // Ciudad
      { wch: 15 },  // Teléfono
      { wch: 35 },  // Dirección
      { wch: 40 }   // Notas
    ]
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Médicos')

    XLSX.writeFile(wb, 'plantilla_medicos.xlsx')

    return {
      success: true,
      message: 'Plantilla descargada correctamente'
    }
  } catch (error) {
    console.error('Error al exportar plantilla:', error)
    return {
      success: false,
      message: 'Error al exportar plantilla: ' + error.message
    }
  }
}