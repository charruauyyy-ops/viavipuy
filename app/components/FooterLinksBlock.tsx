import Link from "next/link";
import styles from "./FooterLinksBlock.module.css";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const COLUMNS = [
  {
    title: "Publicar",
    cta: { label: "Publicar perfil", href: "/publicar" },
    links: [
      { label: "Cómo funciona", href: "/como-funciona" },
      { label: "Planes y beneficios", href: "/planes" },
    ],
  },
  {
    title: "Explorar",
    links: [
      { label: "Activas ahora", href: "/disponibles" },
      { label: "Nuevas", href: "/nuevas" },
      { label: "Mujeres", href: "/mujeres" },
      { label: "Hombres", href: "/hombres" },
      { label: "Trans", href: "/trans" },
      { label: "Todos los servicios", href: "/servicios" },
    ],
  },
  {
    title: "Confianza",
    links: [
      { label: "Verificación VIAVIP", href: "/verificacion" },
      { label: "Reportar perfil", href: "/reportar" },
      { label: "Perfiles denunciados", href: "/denunciados" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "Ayuda", href: "/ayuda" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
];

export default function FooterLinksBlock() {
  return (
    <nav className={styles.outer} aria-label="Navegación del sitio" data-testid="footer-links-block">
      <Link href="/publicar" className={styles.cta} data-testid="cta-publicar">
        <UserIcon className={styles.ctaIcon} />
        Publicar perfil
      </Link>

      <div className={styles.panel}>
        {COLUMNS.map((col) => (
          <div key={col.title} className={styles.col}>
            <h4 className={styles.colTitle}>{col.title}</h4>
            {col.cta && (
              <Link href={col.cta.href} className={styles.ctaSmall} data-testid={`cta-col-${col.title.toLowerCase()}`}>
                <UserIcon className={styles.ctaSmallIcon} />
                {col.cta.label}
              </Link>
            )}
            <ul className={styles.linkList}>
              {(col.links || []).map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={styles.link} data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
