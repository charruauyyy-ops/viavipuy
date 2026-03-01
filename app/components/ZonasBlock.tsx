import Link from "next/link";
import { fetchZonasConteo } from "@/lib/queryPublicaciones";
import styles from "./ZonasBlock.module.css";

const RUTA_MAP: Record<string, string> = {
  mujer: "mujeres",
  hombre: "hombres",
  trans: "trans",
};

interface ZonasBlockProps {
  categoria: "mujer" | "hombre" | "trans";
}

export default async function ZonasBlock({ categoria }: ZonasBlockProps) {
  const zonas = await fetchZonasConteo(categoria);

  if (zonas.length === 0) return null;

  const ruta = RUTA_MAP[categoria] || "mujeres";

  return (
    <nav className={styles.zonasBlock} aria-label="Zonas disponibles" data-testid="zonas-block">
      <h2 className={styles.zonasTitle}>Encontra escorts en</h2>
      <ul className={styles.zonasGrid}>
        {zonas.map((z) => (
          <li key={z.zona_slug} className={styles.zonasItem}>
            <Link
              href={`/${ruta}/${z.zona_slug}`}
              className={styles.zonasLink}
              data-testid={`zona-link-${z.zona_slug}`}
            >
              <span className={styles.zonasName}>{z.zona_display}</span>
              <span className={styles.zonasCount}>{z.total}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
