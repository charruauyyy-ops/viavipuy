import { getServerSupabase } from "@/lib/supabaseServer";
import ListadoGrid from "@/app/components/ListadoGrid";
import { PublicacionItem } from "@/lib/queryPublicaciones";

interface CercaResultsSSRProps {
  lat?: string;
  lon?: string;
  radius?: string;
  limit?: string;
}

export default async function CercaResultsSSR({
  lat,
  lon,
  radius = "3000",
  limit = "60",
}: CercaResultsSSRProps) {
  if (!lat || !lon) {
    return (
      <div className="vv-zone-empty" data-testid="cerca-empty-state">
        <div className="vv-zone-empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="vv-zone-empty-svg"
          >
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h1 className="vv-zone-empty-title">Cerca de mí</h1>
        <p className="vv-zone-empty-subtitle">
          Usa el botón de arriba para encontrar perfiles cerca de tu ubicación
          actual.
        </p>
        <div className="vv-zone-empty-line" />
      </div>
    );
  }

  const supabase = await getServerSupabase();
  if (!supabase) return <div className="vv-empty">Error de configuración.</div>;

  // Parse seguro (evita NaN silencioso)
  const latN = Number(lat);
  const lonN = Number(lon);
  const radiusN = Number.parseInt(radius, 10);
  const limitN = Number.parseInt(limit, 10);

  if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
    return <div className="vv-empty">Ubicación inválida.</div>;
  }

  const safeRadius = Number.isFinite(radiusN) && radiusN > 0 ? radiusN : 3000;
  const safeLimit = Number.isFinite(limitN) && limitN > 0 ? limitN : 60;

  try {
    // IMPORTANTÍSIMO: los nombres deben coincidir con la firma real en DB:
    // public.publicaciones_cerca(in_lat, in_limit, in_lon, in_radius_m)
    const { data, error } = await supabase.rpc("publicaciones_cerca", {
      in_lat: latN,
      in_lon: lonN,
      in_radius_m: safeRadius,
      in_limit: safeLimit,
    });

    if (error) {
      console.error("Error RPC publicaciones_cerca:", error);
      return <div className="vv-empty">Error al buscar perfiles cercanos.</div>;
    }

    const items = (data || []) as PublicacionItem[];

    if (items.length === 0) {
      return (
        <div className="vv-zone-empty">
          <p className="vv-zone-empty-subtitle">
            No se encontraron perfiles en un radio de{" "}
            {Math.round(safeRadius / 100) / 10}km.
          </p>
        </div>
      );
    }

    return (
      <div className="vv-container" style={{ paddingBottom: "40px" }}>
        <p
          style={{
            color: "#999",
            fontSize: "13px",
            padding: "0 16px 12px",
            textAlign: "center",
          }}
        >
          Mostrando {items.length} perfiles cercanos
        </p>
        <ListadoGrid items={items} basePath="/mujeres" />
      </div>
    );
  } catch (err) {
    console.error("Catch CercaResultsSSR:", err);
    return <div className="vv-empty">Error inesperado.</div>;
  }
}
