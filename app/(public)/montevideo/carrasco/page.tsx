import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import HeroSeo from "@/app/components/HeroSeo";
import DestacadasDiamante from "@/app/components/DestacadasDiamante";
import ListadoFiltered from "@/app/components/ListadoFiltered";
import MiniCategoryTabs from "@/app/components/MiniCategoryTabs";
import { fetchPublicaciones } from "@/lib/queryPublicaciones";
import { parseSearchParams, hasActiveFilters } from "@/lib/filters";
import { getSupabasePublicClient } from "@/lib/supabasePublic";

export const metadata = {
  title: "Escorts en Carrasco | Montevideo | VIAVIP",
  description:
    "Explorá escorts en Carrasco, Montevideo, con perfiles verificados y experiencia premium en VIAVIP.",
};

export default async function EscortsCarrascoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = parseSearchParams(params);
  const cat = (params.cat as "mujer" | "hombre" | "trans") || "mujer";

  const { items, count, error } = await fetchPublicaciones(cat, filtros, { departamento: "Montevideo", zona: "Carrasco" });

  let serviciosOptions: string[] = [];
  try {
    const supabase = getSupabasePublicClient();
    if (supabase) {
      const { data } = await supabase
        .from("publicaciones")
        .select("servicios")
        .eq("estado_publicacion", "activo")
        .eq("categoria", cat)
        .eq("departamento", "Montevideo")
        .ilike("zona", "%carrasco%")
        .not("servicios", "is", null);
      if (data) {
        const set = new Set<string>();
        data.forEach((row: any) => {
          if (row.servicios) row.servicios.forEach((s: string) => set.add(s));
        });
        serviciosOptions = Array.from(set).sort();
      }
    }
  } catch {}

  if (error) {
    console.error("Error cargando Carrasco:", error);
  }

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="montevideo" />
      <TrustBlock />
      <DestacadasDiamante categoria={cat} zona="carrasco" />
      <div style={{ padding: "20px 16px 0" }}>
        <h1
          className="vv-section-title"
          style={{ fontSize: "24px", margin: 0 }}
        >
          Escorts VIP en Carrasco
        </h1>
        <p style={{ color: "#999", fontSize: "14px", marginTop: "4px" }}>
          {count} perfiles disponibles
        </p>
      </div>
      <MiniCategoryTabs
        currentCat={cat}
        basePath="/montevideo/carrasco"
        searchParams={params}
      />
      <ListadoFiltered
        items={items}
        count={count}
        filtros={filtros}
        basePath="/montevideo/carrasco"
        hasFilters={hasActiveFilters(filtros)}
        serviciosOptions={serviciosOptions}
        queryContext={{ categoria: cat, extra_dep: "Montevideo", extra_zona: "Carrasco" }}
      />
    </main>
  );
}
