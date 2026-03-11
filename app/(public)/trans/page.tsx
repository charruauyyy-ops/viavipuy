import { parseSearchParams, hasActiveFilters } from "@/lib/filters";
import { fetchPublicaciones } from "@/lib/queryPublicaciones";
import { getSupabasePublicClient } from "@/lib/supabasePublic";
import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import HeroSeo from "@/app/components/HeroSeo";
import CollapsibleText from "@/app/components/CollapsibleText";
import DestacadasDiamante from "@/app/components/DestacadasDiamante";
import ListadoFiltered from "@/app/components/ListadoFiltered";
import ZonasBlock from "@/app/components/ZonasBlock";

export const metadata = {
  title: "Escorts trans en Uruguay | Acompañantes trans VIP verificadas | VIAVIP",
  description:
    "Escorts trans verificadas en Uruguay. Perfiles reales, encuentros discretos y acompañantes trans VIP disponibles ahora.",
};

export default async function TransPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = parseSearchParams(params);
  const { items, count, error } = await fetchPublicaciones("trans", filtros);

  // ✅ NUEVO — desde MV (rápido y estable)
  let serviciosOptions: string[] = [];
  try {
    const supabase = getSupabasePublicClient();
    if (supabase) {
      const { data, error: svcError } = await supabase
        .from("mv_servicios_activos_por_categoria")
        .select("servicio")
        .eq("categoria", "trans")
        .order("servicio", { ascending: true });

      if (!svcError && data) {
        serviciosOptions = data
          .map((r: { servicio: string | null }) => r.servicio)
          .filter(Boolean) as string[];
      }
    }
  } catch {
    serviciosOptions = [];
  }

  if (error) {
    return (
      <main>
        <CategoryTabs />
        <HeroSeo sectionKey="trans" />
        <TrustBlock />
        <div className="vv-empty">Error: {error}</div>
      </main>
    );
  }

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="trans" />
      <TrustBlock />
      <CollapsibleText expandedText="VIAVIP es la plataforma premium de acompañantes en Uruguay. Cada perfil es verificado para garantizar autenticidad y seguridad. Navega con confianza, contacta directamente y vive una experiencia exclusiva." />
      <DestacadasDiamante categoria="trans" />
      <ListadoFiltered
        items={items}
        count={count}
        filtros={filtros}
        basePath="/trans"
        hasFilters={hasActiveFilters(filtros)}
        serviciosOptions={serviciosOptions}
        queryContext={{ categoria: "trans" }}
      />
      <ZonasBlock categoria="trans" />
    </main>
  );
}
