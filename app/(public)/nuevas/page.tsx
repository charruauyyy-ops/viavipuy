import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import HeroSeo from "@/app/components/HeroSeo";
import ZonaListSSR from "@/app/components/ZonaListSSR";
import { getFilteredPublicaciones } from "@/app/lib/publicaciones/getFilteredPublicaciones";

export const metadata = {
  title: "Nuevas - VIAVIP",
  description: "Los perfiles más recientes en VIAVIP Uruguay.",
};

export default async function NuevasPage() {
  const { items, error } = await getFilteredPublicaciones("nuevas");

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="nuevas" />
      <TrustBlock />
      <ZonaListSSR
        title="Nuevas"
        subtitle="Los ingresos más recientes a la plataforma."
        emptyTestId="nuevas-empty-state"
        data={items || []}
        basePath="/mujeres"
      />
    </main>
  );
}
