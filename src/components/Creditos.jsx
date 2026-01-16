import { Code, Mail, Phone, MessageCircle, Heart, Briefcase } from 'lucide-react'
import './Creditos.css'

export default function Creditos() {
  const abrirWhatsApp = () => {
    window.open('https://wa.me/50236583824', '_blank')
  }

  const enviarEmail = () => {
    window.location.href = 'mailto:aguilarhz20001@gmail.com?subject=Consulta sobre Sistema de Visitadoras Médicas'
  }

  return (
    <div className="creditos-container">
      <div className="creditos-card">
        <div className="creditos-header">
          <div className="icon-circle">
            <Code size={32} color="#3b82f6" />
          </div>
          <h2>Desarrollado por</h2>
          <h1>Jonnathan David Franco Hernández</h1>
          <p className="creditos-subtitle">Desarrollador Full Stack</p>
        </div>

        <div className="creditos-divider"></div>

        <div className="creditos-info">
          <h3>
            <Briefcase size={18} />
            Sobre este proyecto
          </h3>
          <p>
            Sistema completo de gestión para visitadoras médicas desarrollado con 
            tecnologías modernas: React, Supabase, PostgreSQL y desplegado en Vercel.
          </p>
          <p className="tech-stack">
            React • Vite • Supabase • PostgreSQL • Leaflet • jsPDF
          </p>
        </div>

        <div className="creditos-divider"></div>

        <div className="creditos-contacto">
          <h3>Información de Contacto</h3>
          
          <div className="contacto-grid">
            <a 
              href="mailto:aguilarhz20001@gmail.com" 
              className="contacto-item"
              onClick={enviarEmail}
            >
              <div className="contacto-icon">
                <Mail size={20} />
              </div>
              <div className="contacto-info">
                <span className="contacto-label">Email</span>
                <span className="contacto-value">aguilarhz20001@gmail.com</span>
              </div>
            </a>

            <a 
              href="tel:+50236583824" 
              className="contacto-item"
            >
              <div className="contacto-icon">
                <Phone size={20} />
              </div>
              <div className="contacto-info">
                <span className="contacto-label">Teléfono</span>
                <span className="contacto-value">3658-3824</span>
              </div>
            </a>

            <button 
              onClick={abrirWhatsApp}
              className="contacto-item contacto-whatsapp"
            >
              <div className="contacto-icon whatsapp-icon">
                <MessageCircle size={20} />
              </div>
              <div className="contacto-info">
                <span className="contacto-label">WhatsApp</span>
                <span className="contacto-value">3658-3824</span>
              </div>
            </button>
          </div>
        </div>

        <div className="creditos-footer">
          <div className="made-with">
            Hecho con <Heart size={14} className="heart-icon" /> en Guatemala
          </div>
          <div className="copyright">
            © {new Date().getFullYear()} Jonnathan Franco. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  )
}