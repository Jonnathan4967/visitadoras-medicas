import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, User, Calendar, DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import './DetallePagoComisionModal.css'

export default function DetallePagoComisionModal({ comision, onClose }) {
  const [comisionCompleta, setComisionCompleta] = useState(null)
  const [visitadora, setVisitadora] = useState(null)
  const [loading, setLoading] = useState(true)
  const [firmaError, setFirmaError] = useState(false)

  useEffect(() => {
    loadDetalleCompleto()
  }, [comision])

  const loadDetalleCompleto = async () => {
    console.log('🔍 Comision recibida:', comision)
    
    try {
      // Cargar datos completos directamente de comisiones_mensuales
      const { data: comisionData, error } = await supabase
        .from('comisiones_mensuales')
        .select('*')
        .eq('id', comision.id)
        .single()

      console.log('📊 Datos de BD:', comisionData)
      
      if (error) {
        console.error('❌ Error:', error)
      }

      if (comisionData) {
        setComisionCompleta(comisionData)
        
        // DEBUG: Ver qué datos tenemos
        console.log('🔑 Campos importantes:')
        console.log('  - nombre_recibe:', comisionData.nombre_recibe)
        console.log('  - firma_url:', comisionData.firma_url)
        console.log('  - visitadora_pagadora_id:', comisionData.visitadora_pagadora_id)
        console.log('  - fecha_pago:', comisionData.fecha_pago)
        console.log('  - estado:', comisionData.estado)
        
        // Cargar visitadora si existe
        if (comisionData.visitadora_pagadora_id) {
          const { data: visitadoraData } = await supabase
            .from('profiles')
            .select('nombre, email, telefono, zona')
            .eq('id', comisionData.visitadora_pagadora_id)
            .single()
          
          console.log('👤 Visitadora:', visitadoraData)
          if (visitadoraData) setVisitadora(visitadoraData)
        }

        // Verificar si la URL de la firma es accesible
        if (comisionData.firma_url) {
          console.log('🖼️ Verificando acceso a firma:', comisionData.firma_url)
          
          // Intentar cargar la imagen
          const img = new Image()
          img.onload = () => console.log('✅ Firma cargada correctamente')
          img.onerror = () => {
            console.error('❌ Error al cargar firma')
            setFirmaError(true)
          }
          img.src = comisionData.firma_url
        }
      }
    } catch (err) {
      console.error('💥 Error cargando detalle:', err)
    }
    
    setLoading(false)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha inválida'
    }
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto || 0)
  }

  // Usar datos completos o datos originales como fallback
  const datos = comisionCompleta || comision

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content modal-detalle-pago" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p>Cargando información...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-detalle-pago" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Detalle del Pago</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              Información completa de la comisión pagada
            </p>
          </div>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Estado */}
          <div className="estado-badge-container">
            <span className="badge-estado-pagado">
              <CheckCircle size={18} />
              Pagado
            </span>
          </div>

          {/* Información del Médico */}
          <div className="info-section">
            <h3>
              <FileText size={18} />
              Información del Médico
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Médico:</span>
                <span className="value"><strong>{datos.nombre_medico || 'N/A'}</strong></span>
              </div>
              <div className="info-item">
                <span className="label">Período:</span>
                <span className="value">
                  {datos.mes && datos.anio 
                    ? `${new Date(datos.anio, datos.mes - 1).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}`
                    : 'Diciembre 2024'}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose de Comisión */}
          <div className="info-section">
            <h3>
              <DollarSign size={18} />
              Desglose de Comisión
            </h3>
            <div className="desglose-table">
              <div className="desglose-row">
                <span>Comisión USG</span>
                <span>{formatMonto(datos.comision_usg)}</span>
              </div>
              <div className="desglose-row">
                <span>Comisión Especial</span>
                <span>{formatMonto(datos.comision_especial)}</span>
              </div>
              <div className="desglose-row">
                <span>Comisión EKG/PAP/LABS</span>
                <span>{formatMonto(datos.comision_ekg)}</span>
              </div>
              <div className="desglose-row total">
                <span><strong>TOTAL PAGADO</strong></span>
                <span><strong>{formatMonto(datos.total_comision)}</strong></span>
              </div>
            </div>
          </div>

          {/* Información del Pago */}
          <div className="info-section">
            <h3>
              <Calendar size={18} />
              Información del Pago
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Fecha de pago:</span>
                <span className="value">{formatDate(datos.fecha_pago)}</span>
              </div>
              <div className="info-item">
                <span className="label">Recibido por:</span>
                <span className="value">
                  <strong>{datos.nombre_recibe || 'No especificado'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Información de la Visitadora */}
          {visitadora && (
            <div className="info-section">
              <h3>
                <User size={18} />
                Visitadora que realizó el pago
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Nombre:</span>
                  <span className="value"><strong>{visitadora.nombre}</strong></span>
                </div>
                <div className="info-item">
                  <span className="label">Email:</span>
                  <span className="value">{visitadora.email}</span>
                </div>
                {visitadora.telefono && (
                  <div className="info-item">
                    <span className="label">Teléfono:</span>
                    <span className="value">{visitadora.telefono}</span>
                  </div>
                )}
                {visitadora.zona && (
                  <div className="info-item">
                    <span className="label">Zona:</span>
                    <span className="value">{visitadora.zona}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Firma */}
          <div className="info-section">
            <h3>
              <FileText size={18} />
              Firma de quien recibió
            </h3>
            
            {datos.firma_url ? (
              <div className="firma-container">
                {!firmaError ? (
                  <>
                    <img 
                      src={datos.firma_url} 
                      alt="Firma de recepción" 
                      className="firma-imagen"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px',
                        backgroundColor: 'white'
                      }}
                      onLoad={() => {
                        console.log('✅ Imagen de firma cargada exitosamente')
                      }}
                      onError={(e) => {
                        console.error('❌ Error cargando imagen de firma:', datos.firma_url)
                        setFirmaError(true)
                      }}
                    />
                    <p className="firma-caption" style={{ 
                      marginTop: '12px',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      Firma de: <strong>{datos.nombre_recibe || 'N/A'}</strong>
                    </p>
                  </>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '32px', 
                    backgroundColor: '#fef2f2',
                    borderRadius: '8px',
                    border: '1px solid #fecaca'
                  }}>
                    <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 12px' }} />
                    <p style={{ color: '#991b1b', fontWeight: '500', marginBottom: '8px' }}>
                      Error al cargar la firma
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                      La imagen existe pero no se puede mostrar
                    </p>
                    <details style={{ fontSize: '12px', color: '#6b7280', textAlign: 'left' }}>
                      <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                        Ver detalles técnicos
                      </summary>
                      <div style={{ 
                        backgroundColor: '#f9fafb', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        wordBreak: 'break-all'
                      }}>
                        <p><strong>URL:</strong> {datos.firma_url}</p>
                        <p style={{ marginTop: '8px' }}>
                          <strong>Posibles causas:</strong>
                        </p>
                        <ul style={{ marginLeft: '20px', marginTop: '4px' }}>
                          <li>El bucket de Supabase Storage no es público</li>
                          <li>La URL expiró o es inválida</li>
                          <li>Problema de CORS</li>
                        </ul>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <AlertCircle size={48} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#6b7280', fontWeight: '500', marginBottom: '4px' }}>
                  No se encontró firma registrada
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  Esta comisión fue pagada sin captura de firma
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Cerrar
          </button>
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}