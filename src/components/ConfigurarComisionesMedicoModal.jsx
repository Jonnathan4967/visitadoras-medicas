import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, Save, DollarSign, Percent, Calculator } from 'lucide-react'
import './ConfigurarComisionesMedicoModal.css'

export default function ConfigurarComisionesMedicoModal({ medico, onClose, onSave }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  
  const [comisiones, setComisiones] = useState({
    usg: { porcentaje: 0, montoBase: 0 },
    especial: { porcentaje: 0, montoBase: 0 },
    ekg: { porcentaje: 0, montoBase: 0 }
  })

  useEffect(() => {
    if (medico) {
      cargarComisiones()
    }
  }, [medico])

  const cargarComisiones = async () => {
    const { data } = await supabase
      .from('comisiones_configuracion')
      .select('*')
      .eq('medico_id', medico.id)
      .single()

    if (data) {
      setComisiones({
        usg: {
          porcentaje: data.porcentaje_usg || 0,
          montoBase: data.monto_base_usg || 0
        },
        especial: {
          porcentaje: data.porcentaje_especial || 0,
          montoBase: data.monto_base_especial || 0
        },
        ekg: {
          porcentaje: data.porcentaje_ekg || 0,
          montoBase: data.monto_base_ekg || 0
        }
      })
    }
  }

  const handleChange = (tipo, campo, valor) => {
    setComisiones(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [campo]: parseFloat(valor) || 0
      }
    }))
  }

  const calcularComision = (porcentaje, montoBase) => {
    return (montoBase * porcentaje / 100).toFixed(2)
  }

  const handleGuardar = async () => {
    setGuardando(true)
    setError('')

    try {
      const dataToSave = {
        medico_id: medico.id,
        porcentaje_usg: comisiones.usg.porcentaje,
        monto_base_usg: comisiones.usg.montoBase,
        porcentaje_especial: comisiones.especial.porcentaje,
        monto_base_especial: comisiones.especial.montoBase,
        porcentaje_ekg: comisiones.ekg.porcentaje,
        monto_base_ekg: comisiones.ekg.montoBase,
        updated_at: new Date().toISOString()
      }

      // Intentar actualizar primero
      const { data: existing } = await supabase
        .from('comisiones_configuracion')
        .select('id')
        .eq('medico_id', medico.id)
        .single()

      if (existing) {
        // Actualizar
        const { error: updateError } = await supabase
          .from('comisiones_configuracion')
          .update(dataToSave)
          .eq('medico_id', medico.id)

        if (updateError) throw updateError
      } else {
        // Insertar
        const { error: insertError } = await supabase
          .from('comisiones_configuracion')
          .insert([dataToSave])

        if (insertError) throw insertError
      }

      // NUEVO: Calcular comisiones totales
      const comisionUSG = (comisiones.usg.montoBase * comisiones.usg.porcentaje / 100)
      const comisionEspecial = (comisiones.especial.montoBase * comisiones.especial.porcentaje / 100)
      const comisionEKG = (comisiones.ekg.montoBase * comisiones.ekg.porcentaje / 100)
      const totalComision = comisionUSG + comisionEspecial + comisionEKG

      // Solo crear registro en comisiones_mensuales si hay comisión > 0
      if (totalComision > 0) {
        // Verificar si ya existe un registro para este médico en el mes actual
        const mesActual = new Date().getMonth() + 1
        const anioActual = new Date().getFullYear()

        const { data: comisionExistente } = await supabase
          .from('comisiones_mensuales')
          .select('id')
          .eq('nombre_medico', medico.nombre)
          .eq('mes', mesActual)
          .eq('anio', anioActual)
          .single()

        if (comisionExistente) {
          // Actualizar la comisión existente
          const { error: updateComisionError } = await supabase
            .from('comisiones_mensuales')
            .update({
              comision_usg: comisionUSG,
              comision_especial: comisionEspecial,
              comision_ekg: comisionEKG
            })
            .eq('id', comisionExistente.id)

          if (updateComisionError) throw updateComisionError
        } else {
          // Crear nueva comisión mensual (sin total_comision, se calcula automático)
          const { error: insertComisionError } = await supabase
            .from('comisiones_mensuales')
            .insert([{
              nombre_medico: medico.nombre,
              mes: mesActual,
              anio: anioActual,
              comision_usg: comisionUSG,
              comision_especial: comisionEspecial,
              comision_ekg: comisionEKG,
              estado: 'pendiente'
            }])

          if (insertComisionError) throw insertComisionError
        }
      }

      alert('✅ Comisiones guardadas y registradas correctamente')
      onSave()
      onClose()
    } catch (error) {
      setError('Error al guardar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const tieneComisiones = () => {
    return comisiones.usg.porcentaje > 0 || 
           comisiones.especial.porcentaje > 0 || 
           comisiones.ekg.porcentaje > 0
  }

  const eliminarComisiones = async () => {
    if (!confirm('¿Estás seguro de eliminar todas las comisiones de este médico?')) {
      return
    }

    setGuardando(true)
    try {
      const { error } = await supabase
        .from('comisiones_configuracion')
        .delete()
        .eq('medico_id', medico.id)

      if (error) throw error

      alert('✅ Comisiones eliminadas')
      setComisiones({
        usg: { porcentaje: 0, montoBase: 0 },
        especial: { porcentaje: 0, montoBase: 0 },
        ekg: { porcentaje: 0, montoBase: 0 }
      })
      onSave()
    } catch (error) {
      setError('Error al eliminar: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-configurar-comisiones">
        <div className="modal-header">
          <h2>Configurar Comisiones</h2>
          <button onClick={onClose} className="btn-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="medico-info-header">
            <DollarSign size={24} color="#10b981" />
            <div>
              <h3>{medico.nombre}</h3>
              {medico.clinica && <p>{medico.clinica}</p>}
            </div>
          </div>

          <p className="comisiones-hint">
            💡 Configura el porcentaje y monto base para cada tipo de comisión
          </p>

          {/* Comisión USG */}
          <div className="comision-config-card">
            <h4>
              <Percent size={18} />
              Comisión USG
            </h4>
            <div className="comision-inputs">
              <div className="input-group">
                <label>Porcentaje (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ej: 15"
                  min="0"
                  max="100"
                  step="0.1"
                  value={comisiones.usg.porcentaje || ''}
                  onChange={(e) => handleChange('usg', 'porcentaje', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Monto Base (Q)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ej: 1000"
                  min="0"
                  step="0.01"
                  value={comisiones.usg.montoBase || ''}
                  onChange={(e) => handleChange('usg', 'montoBase', e.target.value)}
                />
              </div>
            </div>
            {comisiones.usg.porcentaje > 0 && comisiones.usg.montoBase > 0 && (
              <div className="comision-calculada">
                <Calculator size={16} />
                <span>
                  Comisión: <strong>Q{calcularComision(comisiones.usg.porcentaje, comisiones.usg.montoBase)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Comisión Especial */}
          <div className="comision-config-card">
            <h4>
              <Percent size={18} />
              Comisión Especial
            </h4>
            <div className="comision-inputs">
              <div className="input-group">
                <label>Porcentaje (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ej: 20"
                  min="0"
                  max="100"
                  step="0.1"
                  value={comisiones.especial.porcentaje || ''}
                  onChange={(e) => handleChange('especial', 'porcentaje', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Monto Base (Q)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ej: 500"
                  min="0"
                  step="0.01"
                  value={comisiones.especial.montoBase || ''}
                  onChange={(e) => handleChange('especial', 'montoBase', e.target.value)}
                />
              </div>
            </div>
            {comisiones.especial.porcentaje > 0 && comisiones.especial.montoBase > 0 && (
              <div className="comision-calculada">
                <Calculator size={16} />
                <span>
                  Comisión: <strong>Q{calcularComision(comisiones.especial.porcentaje, comisiones.especial.montoBase)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Comisión EKG/PAP/LABS */}
          <div className="comision-config-card">
            <h4>
              <Percent size={18} />
              Comisión EKG/PAP/LABS
            </h4>
            <div className="comision-inputs">
              <div className="input-group">
                <label>Porcentaje (%)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ej: 10"
                  min="0"
                  max="100"
                  step="0.1"
                  value={comisiones.ekg.porcentaje || ''}
                  onChange={(e) => handleChange('ekg', 'porcentaje', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Monto Base (Q)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Ej: 300"
                  min="0"
                  step="0.01"
                  value={comisiones.ekg.montoBase || ''}
                  onChange={(e) => handleChange('ekg', 'montoBase', e.target.value)}
                />
              </div>
            </div>
            {comisiones.ekg.porcentaje > 0 && comisiones.ekg.montoBase > 0 && (
              <div className="comision-calculada">
                <Calculator size={16} />
                <span>
                  Comisión: <strong>Q{calcularComision(comisiones.ekg.porcentaje, comisiones.ekg.montoBase)}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Total calculado */}
          {tieneComisiones() && (
            <div className="total-comisiones">
              <h4>Total Comisiones:</h4>
              <p className="total-amount">
                Q{(
                  parseFloat(calcularComision(comisiones.usg.porcentaje, comisiones.usg.montoBase)) +
                  parseFloat(calcularComision(comisiones.especial.porcentaje, comisiones.especial.montoBase)) +
                  parseFloat(calcularComision(comisiones.ekg.porcentaje, comisiones.ekg.montoBase))
                ).toFixed(2)}
              </p>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {tieneComisiones() && (
            <button
              onClick={eliminarComisiones}
              className="btn btn-danger"
              disabled={guardando}
            >
              Eliminar Todo
            </button>
          )}
          <div className="footer-actions-right">
            <button
              onClick={onClose}
              className="btn btn-secondary"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              className="btn btn-success"
              disabled={guardando}
            >
              <Save size={18} />
              {guardando ? 'Guardando...' : 'Guardar Comisiones'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
