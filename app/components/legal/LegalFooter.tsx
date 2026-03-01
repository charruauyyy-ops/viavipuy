"use client";

import Link from "next/link";

export default function LegalFooter() {
  return (
    <footer className="vvlf-footer" data-testid="legal-footer">
      <div className="vvlf-links-scroll">
        <div className="vvlf-links">
          <Link href="/terminos-y-condiciones" className="vvlf-link" data-testid="link-terminos">
            Terminos y Condiciones
          </Link>
          <span className="vvlf-sep" aria-hidden="true">&middot;</span>
          <Link href="/politica-de-privacidad" className="vvlf-link" data-testid="link-privacidad">
            Politica de Privacidad
          </Link>
          <span className="vvlf-sep" aria-hidden="true">&middot;</span>
          <Link href="/reportar-contenido" className="vvlf-link" data-testid="link-reportar">
            Reportar Contenido
          </Link>
        </div>
      </div>

      <div className="vvlf-divider" />

      <p className="vvlf-brand">
        <span className="vvlf-brand-name">VIAVIP</span>
        <span className="vvlf-brand-year">&nbsp;&middot; 2026</span>
      </p>

      <div className="vvlf-badges">
        <span className="vvlf-badge" data-testid="badge-rta">RTA</span>
        <span className="vvlf-badge" data-testid="badge-safe">SafeLabeling</span>
      </div>
    </footer>
  );
}
