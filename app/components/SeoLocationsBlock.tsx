import Link from "next/link";
import { FEATURED_LOCATIONS } from "@/lib/locationsCatalog";
import { fetchLocationCounts } from "@/lib/queryPublicaciones";

interface SeoLocationsBlockProps {
  basePath?: string;
  categoria?: string;
}

export default async function SeoLocationsBlock({
  basePath = "/mujeres",
  categoria = "mujer",
}: SeoLocationsBlockProps = {}) {
  const counts = await fetchLocationCounts(categoria);

  return (
    <nav className="vv-seo-locations" aria-label="Ubicaciones populares">
      <h2 className="vv-seo-locations-title">Encontra escorts en</h2>
      <ul className="vv-seo-locations-grid">
        {FEATURED_LOCATIONS.map((loc) => (
          <li key={loc.slug} className="vv-seo-locations-item">
            <Link
              href={`${basePath}/${loc.slug}`}
              className="vv-seo-locations-link"
              data-testid={`seo-link-${loc.slug}`}
            >
              <span className="vv-seo-locations-name">{loc.label}</span>
              <span className="vv-seo-locations-count">{counts[loc.slug] || 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
