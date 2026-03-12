export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  title: "Escorts mujeres en Uruguay | Perfiles verificados y reales | VIAVIP",
  description:
    "Explorá escorts mujeres verificadas en Uruguay. Fotos reales, disponibilidad inmediata y contacto directo. Montevideo y todo el país.",
};

export default async function MujeresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = parseSearchParams(params);
  const { items, count, error } = await fetchPublicaciones("mujer", filtros);

  // ✅ NUEVO — desde MV (rápido y estable)
  let serviciosOptions: string[] = [];
  try {
    const supabase = getSupabasePublicClient();
    if (supabase) {
      const { data, error: svcError } = await supabase
        .from("mv_servicios_activos_por_categoria")
        .select("servicio")
        .eq("categoria", "mujer")
        .order("servicio", { ascending: true });

      if (!svcError && data) {
        serviciosOptions = data
          .map((r: { servicio: string | null }) => r.servicio)
          .filter(Boolean) as string[];
      }
    }
  } catch {
    // fail-safe: no rompe la página
    serviciosOptions = [];
  }

  if (error) {
    return (
      <main>
        <CategoryTabs />
        <HeroSeo sectionKey="mujeres" />
        <TrustBlock />
        <div className="vv-empty">Error: {error}</div>
      </main>
    );
  }

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="mujeres" />
      <TrustBlock />
      <CollapsibleText expandedText="VIAVIP es la plataforma premium de acompañantes en Uruguay. Cada perfil es verificado para garantizar autenticidad y seguridad. Navega con confianza, contacta directamente y vive una experiencia exclusiva." />
      <DestacadasDiamante categoria="mujer" />
      <ListadoFiltered
        items={items}
        count={count}
        filtros={filtros}
        basePath="/mujeres"
        hasFilters={hasActiveFilters(filtros)}
        serviciosOptions={serviciosOptions}
        queryContext={{ categoria: "mujer" }}
      />

      <section className="vv-seo-section">
        <h2>Escorts mujeres en Uruguay</h2>
        <p>
          Si estás buscando escorts mujeres en Uruguay, en VIAVIP podés descubrir perfiles reales y verificados de acompañantes independientes. Nuestra plataforma reúne escorts activas en distintas ciudades del país, permitiendo encontrar perfiles nuevos, acompañantes disponibles y opciones cercanas a tu ubicación.
        </p>
        <p>
          En VIAVIP podés explorar escorts mujeres que atienden en Montevideo, Punta del Este, Maldonado y otras zonas de Uruguay. Cada perfil incluye fotos, información personal y contacto directo para coordinar encuentros de forma rápida, discreta y segura.
        </p>
        <p>
          El objetivo de VIAVIP es ofrecer una experiencia clara y confiable para adultos que buscan escorts mujeres en Uruguay. Los perfiles son administrados por las propias acompañantes, lo que permite comunicación directa y disponibilidad actualizada.
        </p>
        <p>
          Explorá escorts mujeres disponibles, descubrí nuevas acompañantes y encontrá perfiles activos en diferentes ciudades del país.
        </p>
      </section>

      <ZonasBlock categoria="mujer" />
    </main>
  );
}
