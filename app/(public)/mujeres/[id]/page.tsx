import { Metadata } from "next";
import { fetchPublicacionMeta } from "@/lib/queryPublicaciones";
import { getServerSupabase } from "@/lib/supabaseServer";
import PerfilView from "@/app/components/PerfilView";
import ListadoGrid from "@/app/components/ListadoGrid";
import ZonasBlock from "@/app/components/ZonasBlock";

import CategoryTabs from "@/app/components/CategoryTabs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeZonaString(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/-/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Función local que trae publicaciones de Supabase y filtra por zona normalizada
async function getPublicacionesPorZona(zona: string) {
  const supabase = await getServerSupabase();
  if (!supabase) return { items: [], count: 0, error: "Error de configuración." };

  try {
    const { data, error } = await supabase
      .from("publicaciones")
      .select("id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,updated_at")
      .eq("estado_publicacion", "activo")
      .eq("categoria", "mujer");

    if (error || !data) return { items: [], count: 0, error: error?.message || "Error cargando perfiles." };

    const items = (data as any[]).filter((item) => {
      const itemZonaNormalizada = normalizeZonaString(item.zona || "");
      return itemZonaNormalizada === zona;
    });

    return { items, count: items.length };
  } catch (err: unknown) {
    return { items: [], count: 0, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (UUID_RE.test(id)) {
    const meta = await fetchPublicacionMeta(id);
    const nombre = meta?.nombre || "Escort";
    const ciudad = meta?.ciudad || "Uruguay";
    const verified = meta?.verification_status === "verified";
    return {
      title: `${nombre} Escort en ${ciudad} | VIAVIP`,
      description: verified
        ? `Perfil verificado de ${nombre} en ${ciudad}. Fotos reales y contacto directo en VIAVIP.`
        : `Perfil de ${nombre} en ${ciudad}. Contacto directo en VIAVIP.`,
      alternates: { canonical: `/mujeres/${id}` },
    };
  }

  const zona = slugToName(id);
  return {
    title: `Escorts en ${zona} Uruguay | Perfiles verificados | VIAVIP`,
    description: `Escorts verificadas en ${zona}. Perfiles reales, fotos auténticas y contacto directo. VIAVIP Uruguay.`,
    alternates: { canonical: `/mujeres/${id}` },
  };
}

export default async function MujeresIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (UUID_RE.test(id)) {
    return (
      <PerfilView category="mujeres">
        <ZonasBlock categoria="mujer" />
      </PerfilView>
    );
  }

  const zona = slugToName(id);
  const zonaQuery = normalizeZonaString(id);
  const { items: filteredItems, count, error } = await getPublicacionesPorZona(zonaQuery);

  return (
    <main>
      <CategoryTabs />
      <div className="vv-zona-header">
        <h1 className="vv-zona-title">Escorts en {zona}</h1>
        <p className="vv-zona-subtitle">
          {count > 0 ? `${count} perfiles verificados y disponibles en ${zona}.` : `Escorts verificadas en ${zona}. Perfiles reales y contacto directo.`}
        </p>
      </div>

      {error ? (
        <div className="vv-zona-empty">
          <p>Error cargando perfiles. Intenta de nuevo.</p>
        </div>
      ) : count > 0 ? (
        <ListadoGrid items={filteredItems} basePath="/mujeres" />
      ) : (
        <div className="vv-zona-empty">
          <p>Actualmente no hay perfiles en esta zona.</p>
        </div>
      )}

      {count <= 6 && <ZonasBlock categoria="mujer" />}

    </main>
  );
}
