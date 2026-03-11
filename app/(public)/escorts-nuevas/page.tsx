import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import HeroSeo from "@/app/components/HeroSeo";
import ZonaListSSR from "@/app/components/ZonaListSSR";
import { getFilteredPublicaciones } from "@/app/lib/publicaciones/getFilteredPublicaciones";

export const metadata = {
  title: "Escorts nuevas en Uruguay | Perfiles recién verificados | VIAVIP",
  description:
    "Encuentra escorts nuevas en Uruguay. Los perfiles más recientes y recién verificados en la plataforma.",
};

export default async function EscortsNuevasPage() {
  const { items, error } = await getFilteredPublicaciones("nuevas");

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="nuevas" />
      <TrustBlock />
      <ZonaListSSR 
        title="Escorts Nuevas" 
        subtitle="Los ingresos más recientes a la plataforma."
        emptyTestId="nuevas-empty-state"
        data={items || []}
        basePath="/mujeres"
      />
    </main>
  );
}
