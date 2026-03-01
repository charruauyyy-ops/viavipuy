import { Metadata } from "next";
import { fetchPublicacionesPorZona, fetchPublicacionMeta } from "@/lib/queryPublicaciones";
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
    title: `Escorts en ${zona} | VIAVIP`,
    description: `Escorts en ${zona}. Perfiles disponibles, fotos y contacto directo. VIAVIP Uruguay.`,
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
  const { items, count, error } = await fetchPublicacionesPorZona("mujer", id);

  return (
    <main>
      <CategoryTabs />
      <div className="vv-zona-header">
        <h1 className="vv-zona-title">Escorts en {zona}</h1>
        <p className="vv-zona-subtitle">
          Perfiles verificados y actualizados. Elegi tu zona y encontra
          disponibles.
        </p>
      </div>

      {error ? (
        <div className="vv-zona-empty">
          <p>Error cargando perfiles. Intenta de nuevo.</p>
        </div>
      ) : count > 0 ? (
        <ListadoGrid items={items} basePath="/mujeres" />
      ) : (
        <div className="vv-zona-empty">
          <p>Actualmente no hay perfiles en esta zona.</p>
        </div>
      )}

      {count <= 6 && <ZonasBlock categoria="mujer" />}

    </main>
  );
}
