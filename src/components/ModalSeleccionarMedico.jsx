import { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import './ModalSeleccionarMedico.css'

export default function ModalSeleccionarMedico({ medicos, onClose, onSelect }) {
  const [busqueda, setBusqueda] = useState('')
  const [medicosFiltrados, setMedicosFiltrados] = useState(medicos)

  useEffect(() => {
    if (busqueda.trim() === '') {
      setMedicosFiltrados(medicos)
    } else {
      const filtered = medicos.filter(medico =>
        medico.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (medico.clinica && medico.clinica.toLowerCase().includes(busqueda.toLowerCase()))
      )
      setMedicosFiltrados(filtered)
    }
  }, [busqueda, medicos])

  const handleSelect = (medico) => {
    onSelect(medico)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-seleccionar-medico">
        <div className="modal-header">
          <h2>Seleccionar Médico</h2>
          <button onClick={onClose} className="btn-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Selecciona el médico para configurar sus comisiones:
          </p>

          {/* Buscador */}
          <div className="search-container-modal">
            <Search size={20} className="search-icon-modal" />
            <input
              type="text"
              className="search-input-modal"
              placeholder="Buscar por nombre o clínica..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
            {busqueda && (
              <button
                className="clear-search-modal"
                onClick={() => setBusqueda('')}
                title="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Contador de resultados */}
          {busqueda && (
            <p className="resultados-count-modal">
              {medicosFiltrados.length} resultado{medicosFiltrados.length !== 1 ? 's' : ''} encontrado{medicosFiltrados.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Lista de médicos */}
          <div className="medicos-list-modal">
            {medicosFiltrados.length > 0 ? (
              medicosFiltrados.map((medico) => (
                <button
                  key={medico.id}
                  className="medico-item-modal"
                  onClick={() => handleSelect(medico)}
                >
                  <div className="medico-info-modal">
                    <h3>{medico.nombre}</h3>
                    {medico.clinica && <p>{medico.clinica}</p>}
                  </div>
                  <div className="medico-arrow-modal">→</div>
                </button>
              ))
            ) : (
              <div className="no-resultados-modal">
                <Search size={48} />
                <p>No se encontraron médicos</p>
                <span>Intenta con otro término de búsqueda</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}