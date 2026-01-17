import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Search, Stethoscope, MapPin, Phone, Building } from 'lucide-react'
import './MedicosVisitadora.css'

export default function MedicosVisitadora() {
  const [medicos, setMedicos] = useState([])
  const [medicosFiltrados, setMedicosFiltrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    loadMedicos()
  }, [])

  useEffect(() => {
    filtrarMedicos()
  }, [busqueda, medicos])

  const loadMedicos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('medicos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (data) {
      setMedicos(data)
      setMedicosFiltrados(data)
    }
    setLoading(false)
  }

  const filtrarMedicos = () => {
    if (!busqueda.trim()) {
      setMedicosFiltrados(medicos)
      return
    }

    const termino = busqueda.toLowerCase()
    const filtrados = medicos.filter(m =>
      m.nombre?.toLowerCase().includes(termino) ||
      m.clinica?.toLowerCase().includes(termino) ||
      m.municipio?.toLowerCase().includes(termino) ||
      m.especialidad?.toLowerCase().includes(termino)
    )
    setMedicosFiltrados(filtrados)
  }

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Cargando médicos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="medicos-visitadora">
      <div className="card">
        <div className="card-header">
          <div>
            <h3>Directorio de Médicos</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
              {medicosFiltrados.length} médicos registrados
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="search-section">
          <div className="search-container">
            <Search size={20} />
            <input
              type="text"
              className="search-input-medicos"
              placeholder="Buscar por nombre, clínica, municipio o especialidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de Médicos */}
        <div className="medicos-grid">
          {medicosFiltrados.length === 0 ? (
            <div className="empty-state">
              <Stethoscope size={48} color="#9ca3af" />
              <h3>No se encontraron médicos</h3>
              <p>Intenta ajustar tu búsqueda</p>
            </div>
          ) : (
            medicosFiltrados.map((medico) => (
              <div key={medico.id} className="medico-card-view">
                <div className="medico-header">
                  <div className="medico-avatar">
                    <Stethoscope size={24} />
                  </div>
                  <div className="medico-info-principal">
                    <h4>{medico.nombre}</h4>
                    {medico.especialidad && (
                      <span className="especialidad-badge">{medico.especialidad}</span>
                    )}
                  </div>
                </div>

                <div className="medico-details">
                  {medico.clinica && (
                    <div className="detail-item">
                      <Building size={16} />
                      <span>{medico.clinica}</span>
                    </div>
                  )}

                  {medico.municipio && (
                    <div className="detail-item">
                      <MapPin size={16} />
                      <span>{medico.municipio}</span>
                    </div>
                  )}

                  {medico.telefono && (
                    <div className="detail-item">
                      <Phone size={16} />
                      <a href={`tel:${medico.telefono}`}>{medico.telefono}</a>
                    </div>
                  )}

                  {medico.direccion && (
                    <div className="direccion-completa">
                      <p className="direccion-label">Dirección:</p>
                      <p className="direccion-text">{medico.direccion}</p>
                    </div>
                  )}

                  {medico.referencia && (
                    <div className="referencia">
                      <p className="referencia-label">Referencia:</p>
                      <p className="referencia-text">{medico.referencia}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}