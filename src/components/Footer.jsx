import { Code } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <Code size={14} />
          <span>Desarrollado por <strong>Jonnathan Franco</strong></span>
        </div>
        <div className="footer-right">
          <a href="mailto:aguilarhz20001@gmail.com">aguilarhz20001@gmail.com</a>
          <span className="separator">•</span>
          <a href="https://wa.me/50236583824" target="_blank" rel="noopener noreferrer">
            3658-3824
          </a>
        </div>
      </div>
    </footer>
  )
}