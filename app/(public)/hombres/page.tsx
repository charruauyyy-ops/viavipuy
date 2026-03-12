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
  title: "Escorts hombres en Uruguay | Acompañantes VIP masculinos | VIAVIP",
  description:
    "Escorts hombres en Uruguay con perfiles verificados. Encuentros discretos, acompañantes masculinos VIP y contacto directo seguro.",
};

export default async function HombresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = parseSearchParams(params);
  const { items, count, error } = await fetchPublicaciones("hombre", filtros);

  // ✅ NUEVO — desde MV (rápido y estable)
  let serviciosOptions: string[] = [];
  try {
    const supabase = getSupabasePublicClient();
    if (supabase) {
      const { data, error: svcError } = await supabase
        .from("mv_servicios_activos_por_categoria")
        .select("servicio")
        .eq("categoria", "hombre")
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
        <HeroSeo sectionKey="hombres" />
        <TrustBlock />
        <div className="vv-empty">Error: {error}</div>
      </main>
    );
  }

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="hombres" />
      <TrustBlock />
      <CollapsibleText expandedText="VIAVIP es la plataforma premium de acompañantes en Uruguay. Cada perfil es verificado para garantizar autenticidad y seguridad. Navega con confianza, contacta directamente y vive una experiencia exclusiva." />
      <DestacadasDiamante categoria="hombre" />
      <ListadoFiltered
        items={items}
        count={count}
        filtros={filtros}
        basePath="/hombres"
        hasFilters={hasActiveFilters(filtros)}
        serviciosOptions={serviciosOptions}
        queryContext={{ categoria: "hombre" }}
      />

      <ZonasBlock categoria="hombre" />

      <section className="vv-seo-section">
        <h2>Escorts hombres en Uruguay</h2>
        <p>
          Si estás buscando escorts hombres en Uruguay, en VIAVIP podés descubrir perfiles reales y verificados de acompañantes independientes. Nuestra plataforma reúne escorts hombres activos en distintas ciudades del país, permitiendo encontrar perfiles nuevos, acompañantes disponibles y opciones cercanas a tu ubicación.
        </p>
        <p>
          En VIAVIP podés explorar escorts hombres que atienden en Montevideo, Punta del Este, Maldonado y otras zonas de Uruguay. Cada perfil incluye fotos, información personal y contacto directo para coordinar encuentros de forma rápida, discreta y segura.
        </p>
        <p>
          El objetivo de VIAVIP es ofrecer una experiencia clara y confiable para adultos que buscan escorts hombres en Uruguay. Los perfiles son administrados por los propios acompañantes, lo que permite comunicación directa y disponibilidad actualizada.
        </p>
        <p>
          Explorá escorts hombres disponibles, descubrí nuevos acompañantes y encontrá perfiles activos en diferentes ciudades del país.
        </p>
      </section>
    </main>
  );
}
