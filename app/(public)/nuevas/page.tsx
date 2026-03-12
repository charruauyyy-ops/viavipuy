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

      <section className="vv-seo-section">
        <h2>Escorts nuevas en VIAVIP</h2>
        <p>
          En esta sección podés descubrir escorts nuevas que se han unido recientemente a VIAVIP. Nuestra plataforma reúne perfiles reales y verificados de acompañantes independientes que acaban de publicar su perfil, permitiendo encontrar nuevas escorts disponibles en distintas zonas de Uruguay.
        </p>
        <p>
          Las escorts nuevas suelen ofrecer perfiles actualizados con fotos recientes, información personal y contacto directo. Esto permite descubrir acompañantes recién registradas y perfiles que comenzaron a atender recientemente en ciudades como Montevideo, Punta del Este y otras zonas del país.
        </p>
        <p>
          En VIAVIP los perfiles son administrados por las propias acompañantes, lo que garantiza que la información esté actualizada y que puedas comunicarte directamente para consultar disponibilidad o coordinar encuentros de forma rápida y discreta.
        </p>
        <p>
          Explorá las escorts nuevas disponibles en VIAVIP y descubrí acompañantes que se han incorporado recientemente a la plataforma.
        </p>
      </section>
    </main>
  );
}
