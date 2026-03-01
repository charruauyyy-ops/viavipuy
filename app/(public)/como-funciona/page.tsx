import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Cómo funciona VIAVIP",
  description:
    "Descubrí cómo funciona VIAVIP: verificación, creación de perfil, planes de visibilidad y activación rápida.",
};

export default function ComoFuncionaPage() {
  return (
    <main className={styles.wrap}>
      <section className={styles.hero}>
        <h1 className={styles.h1}>Cómo funciona VIAVIP</h1>

        <p className={styles.lead}>
          Publicar tu perfil en VIAVIP es un proceso rápido, seguro y optimizado para que
          obtengas máxima visibilidad dentro de la plataforma. Nuestro sistema de verificación
          y posicionamiento está diseñado para mostrar perfiles reales y generar tráfico de
          calidad.
        </p>

        <p className={styles.p}>
          El primer paso es completar la verificación de identidad, requisito obligatorio para
          garantizar que todos los perfiles en VIAVIP sean auténticos y mayores de edad. Esto
          aumenta la confianza de los usuarios y mejora el rendimiento de tu anuncio.
        </p>

        <p className={styles.p}>
          Luego podés crear tu perfil profesional, subiendo fotos reales, completando tu
          descripción, indicando tus servicios, zonas de atención y preferencias. Los perfiles
          completos tienen mejor posicionamiento en los listados de VIAVIP y reciben más visitas.
        </p>

        <p className={styles.p}>
          Después elegís tu plan de visibilidad, que determina el nivel de exposición de tu perfil
          dentro de la plataforma. Los perfiles con mayor visibilidad obtienen más visualizaciones,
          más favoritos y más contactos reales.
        </p>

        <p className={styles.p}>
          Una vez activado, tu perfil aparece automáticamente en las secciones correspondientes
          (Mujeres, Hombres o Trans) y comienza a recibir tráfico dentro de VIAVIP. Desde tu panel
          podés actualizar tu información, gestionar tus fotos y activar el estado Disponible ahora
          cuando lo necesites.
        </p>

        <p className={styles.p}>
          VIAVIP está optimizado para que tu perfil destaque, gane visibilidad y genere resultados reales.
        </p>

        <div className={styles.ctaRow}>
          <Link href="/publicar" className={styles.ctaBtn}>
            <span className={styles.ctaIcon} aria-hidden="true">👤</span>
            Publicar mi perfil ahora
          </Link>
          <div className={styles.microcopy}>
            Proceso privado • Perfiles verificados • Activación rápida
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="Paso a paso para publicar en VIAVIP">
        <h2 className={styles.h2}>Paso a paso para publicar en VIAVIP</h2>

        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>01</div>
            <div>
              <div className={styles.stepTitle}>Verificá tu identidad de forma segura</div>
              <div className={styles.stepText}>
                La verificación es obligatoria para mantener perfiles reales y mayor confianza.
              </div>
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNum}>02</div>
            <div>
              <div className={styles.stepTitle}>Creá tu perfil con fotos reales</div>
              <div className={styles.stepText}>
                Completá tu descripción, servicios y zonas. Los perfiles completos se posicionan mejor.
              </div>
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNum}>03</div>
            <div>
              <div className={styles.stepTitle}>Elegí tu plan de visibilidad</div>
              <div className={styles.stepText}>
                El plan define tu exposición dentro de VIAVIP: más visibilidad, más tráfico.
              </div>
            </div>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNum}>04</div>
            <div>
              <div className={styles.stepTitle}>Activá tu perfil y empezá a recibir contactos</div>
              <div className={styles.stepText}>
                Tu perfil aparece en la sección correspondiente y puede recibir contactos reales.
              </div>
            </div>
          </div>
        </div>

        <div className={styles.centerCta}>
          <Link href="/publicar" className={styles.ctaBtnBig}>
            <span className={styles.ctaIcon} aria-hidden="true">👤</span>
            Publicar perfil
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-label="Preguntas frecuentes sobre VIAVIP">
        <h2 className={styles.h2}>Preguntas frecuentes sobre VIAVIP</h2>

        <div className={styles.faq}>
          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Cómo publico mi perfil en VIAVIP?</summary>
            <div className={styles.faqA}>
              Solo tenés que verificar tu identidad, completar tu perfil con fotos reales y activar tu
              plan de visibilidad. El proceso es rápido y tu perfil queda online en minutos.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿La verificación de identidad es obligatoria?</summary>
            <div className={styles.faqA}>
              Sí. En VIAVIP exigimos verificación para garantizar perfiles reales, mayor seguridad y
              confianza dentro de la plataforma.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Cuánto tarda en activarse mi perfil?</summary>
            <div className={styles.faqA}>
              La activación suele ser inmediata una vez completados los requisitos mínimos y seleccionado
              el plan.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Puedo editar mi perfil después de publicarlo?</summary>
            <div className={styles.faqA}>
              Sí. Desde tu panel podés actualizar fotos, descripción, servicios, precios y estado
              “Disponible ahora” en cualquier momento.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Qué plan me conviene elegir?</summary>
            <div className={styles.faqA}>
              Depende de la visibilidad que busques. Los planes superiores ofrecen mejor posicionamiento,
              más exposición y mayor volumen de visitas.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿VIAVIP funciona en Uruguay?</summary>
            <div className={styles.faqA}>
              Sí. VIAVIP está optimizado para Uruguay, especialmente Montevideo y Punta del Este, y
              continúa expandiendo cobertura.
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
