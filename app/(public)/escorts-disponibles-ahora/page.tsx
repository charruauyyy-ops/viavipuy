import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import HeroSeo from "@/app/components/HeroSeo";
import ZonaListSSR from "@/app/components/ZonaListSSR";
import { getFilteredPublicaciones } from "@/app/lib/publicaciones/getFilteredPublicaciones";

export const metadata = {
  title: "Escorts disponibles ahora en Uruguay | VIAVIP",
  description:
    "Encuentra escorts disponibles para encuentro inmediato en Uruguay. Perfiles verificados listos ahora.",
};

export default async function EscortsDisponiblesAhoraPage() {
  const { items, error } = await getFilteredPublicaciones("disponibles");

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="disponibles" />
      <TrustBlock />
      <ZonaListSSR
        title="Disponibles Ahora"
        subtitle="Perfiles activos en este momento."
        emptyTestId="disponibles-empty-state"
        data={items || []}
        basePath="/mujeres"
      />
    </main>
  );
}
