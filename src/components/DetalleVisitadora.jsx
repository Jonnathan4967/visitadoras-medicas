import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  X, User, MapPin, Phone, Mail, Calendar, TrendingUp, 
  DollarSign, FileText, ChevronDown, ChevronUp, Save, Edit2, Search, ExternalLink
} from 'lucide-react';
import './DetalleVisitadora.css';

export default function DetalleVisitadora({ visitadoraId, onClose }) {
  const [visitadora, setVisitadora] = useState(null);
  const [visitas, setVisitas] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisitaId, setExpandedVisitaId] = useState(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mostrarVisitas, setMostrarVisitas] = useState(false);
  const [buscandoVisitas, setBuscandoVisitas] = useState(false);
  
  // Estados para filtros
  const [filtroVisitas, setFiltroVisitas] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [filtroComisiones, setFiltroComisiones] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    zona: '',
    telefono: ''
  });

  useEffect(() => {
    loadData();
  }, [visitadoraId]);

  const loadData = async () => {
    setLoading(true);

    // Cargar perfil de visitadora
    const { data: perfilData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', visitadoraId)
      .single();

    if (perfilData) {
      setVisitadora(perfilData);
      setFormData({
        nombre: perfilData.nombre || '',
        zona: perfilData.zona || '',
        telefono: perfilData.telefono || ''
      });
    }

    // Cargar comisiones
    const { data: comisionesData } = await supabase
      .from('comisiones')
      .select('*')
      .eq('visitadora_id', visitadoraId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false });

    if (comisionesData) {
      setComisiones(comisionesData);
    }

    setLoading(false);
  };

  // Función para cargar visitas bajo demanda
  const cargarVisitas = async () => {
    setBuscandoVisitas(true);
    
    const { data: visitasData } = await supabase
      .from('visitas')
      .select('*')
      .eq('visitadora_id', visitadoraId)
      .order('created_at', { ascending: false });

    if (visitasData) {
      setVisitas(visitasData);
      setMostrarVisitas(true);
    }
    
    setBuscandoVisitas(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: formData.nombre,
        zona: formData.zona,
        telefono: formData.telefono
      })
      .eq('id', visitadoraId);

    if (!error) {
      setVisitadora({ ...visitadora, ...formData });
      setEditando(false);
    }
    
    setGuardando(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (fechaString) => {
    // fechaString viene en formato YYYY-MM-DD desde getDateString()
    const [year, month, day] = fechaString.split('-');
    
    const meses = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    
    const mesNombre = meses[parseInt(month) - 1];
    
    return `${day} ${mesNombre} ${year}`;
  };

  // CORRECCIÓN: Función para convertir timestamp UTC a fecha local de Guatemala
  const getDateString = (dateString) => {
    const date = new Date(dateString);
    const guatemalaOffset = 6 * 60 * 60 * 1000; // UTC-6
    const guatemalaDate = new Date(date.getTime() - guatemalaOffset);
    
    const year = guatemalaDate.getUTCFullYear();
    const month = String(guatemalaDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(guatemalaDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const getMesNombre = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1];
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(monto);
  };

  // Filtrar visitas con corrección de zona horaria
  const visitasFiltradas = visitas.filter(visita => {
    if (fechaSeleccionada) {
      const visitaFecha = getDateString(visita.created_at);
      if (visitaFecha !== fechaSeleccionada) return false;
    }

    if (!filtroVisitas) return true;
    const searchTerm = filtroVisitas.toLowerCase();
    return (
      visita.nombre_cliente?.toLowerCase().includes(searchTerm) ||
      visita.direccion?.toLowerCase().includes(searchTerm) ||
      visita.tipo_establecimiento?.toLowerCase().includes(searchTerm) ||
      visita.observaciones?.toLowerCase().includes(searchTerm)
    );
  });

  // Agrupar visitas por fecha (corregido)
  const visitasPorDia = visitasFiltradas.reduce((grupos, visita) => {
    const fecha = getDateString(visita.created_at);
    if (!grupos[fecha]) {
      grupos[fecha] = [];
    }
    grupos[fecha].push(visita);
    return grupos;
  }, {});

  const fechasOrdenadas = Object.keys(visitasPorDia).sort((a, b) => b.localeCompare(a));

  // Filtrar comisiones
  const comisionesFiltradas = comisiones.filter(comision => {
    if (!filtroComisiones) return true;
    const searchTerm = filtroComisiones.toLowerCase();
    const periodo = `${getMesNombre(comision.mes)} ${comision.anio}`.toLowerCase();
    const estado = comision.estado.toLowerCase();
    return periodo.includes(searchTerm) || estado.includes(searchTerm);
  });

  // Calcular estadísticas con corrección de zona horaria
  const stats = {
    totalVisitas: visitas.length,
    visitasHoy: visitas.filter(v => {
      const ahora = new Date();
      const guatemalaOffset = 6 * 60 * 60 * 1000;
      const guatemalaAhora = new Date(ahora.getTime() - guatemalaOffset);
      
      const year = guatemalaAhora.getUTCFullYear();
      const month = String(guatemalaAhora.getUTCMonth() + 1).padStart(2, '0');
      const day = String(guatemalaAhora.getUTCDate()).padStart(2, '0');
      const hoyString = `${year}-${month}-${day}`;
      
      const visitaFecha = getDateString(v.created_at);
      return visitaFecha === hoyString;
    }).length,
    comisionesPagadas: comisiones
      .filter(c => c.estado === 'pagado')
      .reduce((sum, c) => sum + parseFloat(c.monto_pagado || 0), 0)
  };

  const limpiarFiltros = () => {
    setFiltroVisitas('');
    setFechaSeleccionada('');
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '16px', color: '#6b7280' }}>Cargando información...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h2>Detalle de Visitadora</h2>
          <button onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="detalle-content">
          {/* Información Personal */}
          <div className="info-card">
            <div className="info-header">
              <div className="info-title">
                <User size={20} />
                <h3>Información Personal</h3>
              </div>
              {!editando && (
                <button 
                  onClick={() => setEditando(true)}
                  className="btn btn-secondary btn-small"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
              )}
            </div>

            {editando ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    name="nombre"
                    type="text"
                    className="input"
                    value={formData.nombre}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Zona</label>
                  <input
                    name="zona"
                    type="text"
                    className="input"
                    value={formData.zona}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    name="telefono"
                    type="text"
                    className="input"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
                <div className="edit-actions">
                  <button 
                    onClick={() => setEditando(false)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleGuardar}
                    className="btn btn-success"
                    disabled={guardando}
                  >
                    <Save size={16} />
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <Mail size={16} />
                  <div>
                    <span className="info-label">Email</span>
                    <span className="info-value">{visitadora.email}</span>
                  </div>
                </div>
                <div className="info-item">
                  <User size={16} />
                  <div>
                    <span className="info-label">Nombre</span>
                    <span className="info-value">{visitadora.nombre || 'No asignado'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <MapPin size={16} />
                  <div>
                    <span className="info-label">Zona</span>
                    <span className="info-value">{visitadora.zona || 'No asignada'}</span>
                  </div>
                </div>
                <div className="info-item">
                  <Phone size={16} />
                  <div>
                    <span className="info-label">Teléfono</span>
                    <span className="info-value">{visitadora.telefono || 'No asignado'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estadísticas - Solo si ya se cargaron visitas */}
          {mostrarVisitas && (
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
                  <Calendar size={20} color="#3b82f6" />
                </div>
                <div>
                  <p className="stat-label">Visitas Hoy</p>
                  <p className="stat-number">{stats.visitasHoy}</p>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                  <TrendingUp size={20} color="#10b981" />
                </div>
                <div>
                  <p className="stat-label">Total Visitas</p>
                  <p className="stat-number">{stats.totalVisitas}</p>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon" style={{ backgroundColor: '#dcfce7' }}>
                  <DollarSign size={20} color="#10b981" />
                </div>
                <div>
                  <p className="stat-label">Comisiones Pagadas</p>
                  <p className="stat-number">{formatMonto(stats.comisionesPagadas)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comisiones */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <DollarSign size={20} />
                Comisiones
              </h3>
              <div className="search-box" style={{ maxWidth: '300px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar por período o estado..."
                  value={filtroComisiones}
                  onChange={(e) => setFiltroComisiones(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            {comisionesFiltradas.length === 0 ? (
              <p className="empty-text">
                {filtroComisiones ? 'No se encontraron comisiones con ese criterio' : 'No hay comisiones registradas'}
              </p>
            ) : (
              <div className="table-responsive">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Visitas</th>
                      <th>Monto</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comisionesFiltradas.map((comision) => (
                      <tr key={comision.id}>
                        <td>{getMesNombre(comision.mes)} {comision.anio}</td>
                        <td>{comision.total_visitas}</td>
                        <td><strong>{formatMonto(comision.monto_comision)}</strong></td>
                        <td>
                          <span className={`status-badge status-${comision.estado}`}>
                            {comision.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Visitas */}
          <div className="section-card">
            <div className="section-header">
              <h3>
                <FileText size={20} />
                Visitas {mostrarVisitas && `(${visitasFiltradas.length})`}
              </h3>
              {!mostrarVisitas && (
                <button 
                  onClick={cargarVisitas}
                  className="btn btn-primary"
                  disabled={buscandoVisitas}
                >
                  <Search size={16} />
                  {buscandoVisitas ? 'Cargando...' : 'Ver Visitas'}
                </button>
              )}
            </div>

            {!mostrarVisitas ? (
              <div className="empty-preview">
                <Search size={48} color="#d1d5db" />
                <h4>Haz clic en "Ver Visitas" para cargar la información</h4>
                <p>Las visitas se mostrarán aquí</p>
              </div>
            ) : (
              <>
                <div className="filtros-container">
                  <div className="filtro-grupo">
                    <label className="filtro-label">Buscar por fecha:</label>
                    <input
                      type="date"
                      value={fechaSeleccionada}
                      onChange={(e) => setFechaSeleccionada(e.target.value)}
                      className="input-date"
                    />
                  </div>

                  <div className="filtro-grupo">
                    <label className="filtro-label">Buscar por texto:</label>
                    <div className="search-box">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Cliente, dirección, tipo..."
                        value={filtroVisitas}
                        onChange={(e) => setFiltroVisitas(e.target.value)}
                        className="search-input"
                      />
                    </div>
                  </div>

                  {(filtroVisitas || fechaSeleccionada) && (
                    <button 
                      onClick={limpiarFiltros}
                      className="btn btn-secondary btn-small"
                      style={{ alignSelf: 'flex-end' }}
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {visitasFiltradas.length === 0 ? (
                  <p className="empty-text">
                    {(filtroVisitas || fechaSeleccionada) 
                      ? 'No se encontraron visitas con ese criterio' 
                      : 'No hay visitas registradas'}
                  </p>
                ) : (
                  <div className="visitas-por-dia">
                    {fechasOrdenadas.map((fecha) => (
                      <div key={fecha} className="dia-grupo">
                        <div className="dia-header">
                          <Calendar size={16} />
                          <h4>{formatDateOnly(fecha)}</h4>
                          <span className="dia-contador">
                            {visitasPorDia[fecha].length} {visitasPorDia[fecha].length === 1 ? 'visita' : 'visitas'}
                          </span>
                        </div>

                        <div className="visitas-list-detalle">
                          {visitasPorDia[fecha].map((visita) => (
                            <div key={visita.id} className="visita-item-detalle">
                              <div 
                                className="visita-header-detalle"
                                onClick={() => setExpandedVisitaId(
                                  expandedVisitaId === visita.id ? null : visita.id
                                )}
                              >
                                <div>
                                  <h4>{visita.nombre_cliente}</h4>
                                  <p className="visita-meta">
                                    {new Date(visita.created_at).toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                {expandedVisitaId === visita.id ? (
                                  <ChevronUp size={20} />
                                ) : (
                                  <ChevronDown size={20} />
                                )}
                              </div>

                              {expandedVisitaId === visita.id && (
                                <div className="visita-details-detalle">
                                  <div className="detail-row">
                                    <p><strong>Dirección:</strong> {visita.direccion}</p>
                                  </div>
                                  
                                  {visita.tipo_establecimiento && (
                                    <div className="detail-row">
                                      <p><strong>Tipo:</strong> {visita.tipo_establecimiento}</p>
                                    </div>
                                  )}

                                  {visita.productos_presentados && visita.productos_presentados.length > 0 && (
                                    <div className="detail-row">
                                      <p><strong>Servicios/Estudios:</strong></p>
                                      <div className="servicios-tags">
                                        {visita.productos_presentados.map((servicio, index) => (
                                          <span key={index} className="servicio-tag">
                                            {servicio}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="detail-row observaciones-row">
                                    <p><strong>Observaciones:</strong></p>
                                    <p className="observaciones-text">{visita.observaciones || 'Sin observaciones'}</p>
                                  </div>

                                  {visita.latitud && visita.longitud && (
                                    <div className="detail-row">
                                      <p><strong>Ubicación GPS:</strong></p>
                                      <div className="ubicacion-gps-admin">
                                        <div className="coordenadas-admin">
                                          <div className="coord-admin-item">
                                            <span>Lat:</span>
                                            <span>{visita.latitud.toFixed(6)}</span>
                                          </div>
                                          <div className="coord-admin-item">
                                            <span>Lng:</span>
                                            <span>{visita.longitud.toFixed(6)}</span>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => {
                                            const url = `https://www.google.com/maps?q=${visita.latitud},${visita.longitud}`
                                            window.open(url, '_blank')
                                          }}
                                          className="btn-maps-admin"
                                        >
                                          <ExternalLink size={14} />
                                          Ver en Maps
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {visita.firma_url && (
                                    <div className="detail-row">
                                      <p><strong>Firma del Cliente:</strong></p>
                                      <div className="firma-display">
                                        <img 
                                          src={visita.firma_url} 
                                          alt="Firma del cliente" 
                                          className="firma-imagen"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}