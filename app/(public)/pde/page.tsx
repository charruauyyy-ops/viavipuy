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
  title: "Escorts en Punta del Este VIP | Perfiles Verificados | VIAVIP",
  description:
    "Encuentra escorts en Punta del Este con perfiles verificados. Acompañantes premium en Maldonado.",
};

export default async function EscortsPuntaDelEstePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = parseSearchParams(params);
  const cat = (params.cat as "mujer" | "hombre" | "trans") || "mujer";

  const { items, count, error } = await fetchPublicaciones(cat, filtros, {
    ciudad: "Maldonado",
    zona: "Punta del este",
  });

  let serviciosOptions: string[] = [];
  try {
    const supabase = getSupabasePublicClient();
    if (supabase) {
      const { data } = await supabase
        .from("publicaciones")
        .select("servicios")
        .eq("estado_publicacion", "activo")
        .eq("categoria", cat)
        .eq("ciudad", "Maldonado")
        .ilike("zona", "%punta del este%")
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
    console.error("Error cargando Punta del Este:", error);
  }

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="punta_del_este" />
      <TrustBlock />
      <DestacadasDiamante categoria={cat} zona="pde" />

      <div style={{ padding: "20px 16px 0" }}>
        <h1
          className="vv-section-title"
          style={{ fontSize: "24px", margin: 0 }}
        >
          Escorts VIP en Punta del Este
        </h1>
        <p style={{ color: "#999", fontSize: "14px", marginTop: "4px" }}>
          {count} perfiles disponibles
        </p>
      </div>

      <MiniCategoryTabs
        currentCat={cat}
        basePath="/escorts-punta-del-este"
        searchParams={params}
      />

      <ListadoFiltered
        items={items}
        count={count}
        filtros={filtros}
        basePath="/escorts-punta-del-este"
        hasFilters={hasActiveFilters(filtros)}
        serviciosOptions={serviciosOptions}
        queryContext={{
          categoria: cat,
          extra_ciudad: "Maldonado",
          extra_zona: "Punta del este",
        }}
      />

      <section className="vv-seo-section">
        <h2>Escorts en Punta del Este</h2>
        <p>
          Si estás buscando escorts en Punta del Este, en VIAVIP podés descubrir perfiles reales y verificados de acompañantes independientes. Nuestra plataforma reúne escorts que trabajan en diferentes zonas de la ciudad y alrededores, permitiendo encontrar perfiles activos y nuevas escorts disponibles en uno de los destinos más exclusivos de Uruguay.
        </p>
        <p>
          En VIAVIP podés explorar escorts en Punta del Este que atienden en zonas como Península, Playa Brava, Playa Mansa, La Barra, Maldonado y otros puntos cercanos. Cada perfil incluye fotos, información personal y formas de contacto directo para coordinar encuentros de manera rápida y discreta.
        </p>
        <p>
          El objetivo de VIAVIP es ofrecer una experiencia clara y segura para adultos que buscan escorts en Punta del Este. Los perfiles son administrados por las propias acompañantes, lo que permite comunicación directa y disponibilidad actualizada.
        </p>
        <p>
          Explorá escorts disponibles en Punta del Este, descubrí nuevas acompañantes y encontrá perfiles activos en uno de los destinos más exclusivos del país.
        </p>
      </section>
    </main>
  );
}
