import CategoryTabs from "@/app/components/CategoryTabs";
import TrustBlock from "@/app/components/TrustBlock";
import HeroSeo from "@/app/components/HeroSeo";
import CercaControls from "./CercaControls";
import CercaResultsSSR from "./CercaResultsSSR";

export const metadata = {
  title: "Cerca de mí - VIAVIP",
  description: "Encuentra acompañantes premium cerca de tu ubicación actual en Uruguay.",
};

export default async function CercaPage({
  searchParams,
}: {
  searchParams: Promise<{ lat?: string; lon?: string; radius?: string; limit?: string }>;
}) {
  const params = await searchParams;

  return (
    <main>
      <CategoryTabs />
      <HeroSeo sectionKey="cerca" />
      <TrustBlock />
      
      <div style={{ padding: "24px 16px 8px", textAlign: "center" }}>
        <h1 className="vv-section-title" style={{ fontSize: "26px", margin: 0, letterSpacing: "1px" }}>
          CERCA DE MÍ
        </h1>
      </div>

      <CercaControls />
      
      <CercaResultsSSR 
        lat={params.lat} 
        lon={params.lon} 
        radius={params.radius} 
        limit={params.limit} 
      />
    </main>
  );
}
