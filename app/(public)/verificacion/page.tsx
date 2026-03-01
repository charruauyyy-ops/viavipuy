import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Verificación VIAVIP",
  description: "Cómo funciona la verificación de perfiles en VIAVIP Uruguay.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Qué significa “Perfil verificado” en VIAVIP?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Significa que el perfil pasó por un proceso de validación de identidad y revisión de fotos para confirmar que se trata de una persona real y mayor de edad."
      }
    },
    {
      "@type": "Question",
      "name": "¿La verificación es obligatoria para publicar?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí. En VIAVIP la verificación es requisito obligatorio para mantener la calidad, seguridad y confianza dentro de la plataforma."
      }
    },
    {
      "@type": "Question",
      "name": "¿Qué se revisa durante la verificación?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Se valida la identidad y se controlan fotos reales para reducir perfiles falsos y mejorar la calidad del sitio."
      }
    },
    {
      "@type": "Question",
      "name": "¿Cuánto demora la verificación del perfil?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "En la mayoría de los casos la verificación se procesa rápidamente una vez enviada la información requerida."
      }
    },
    {
      "@type": "Question",
      "name": "¿Mis datos son privados durante la verificación?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí. VIAVIP utiliza procesos seguros y confidenciales para proteger la información durante todo el proceso."
      }
    },
    {
      "@type": "Question",
      "name": "¿Puedo actualizar mi perfil después de verificarme?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí. Podés editar fotos, descripción y datos desde tu panel cuando quieras."
      }
    }
  ]
};

export default function VerificacionPage() {
  return (
    <main className={styles.wrap}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className={styles.hero}>
        <h1 className={styles.h1}>Verificación VIAVIP</h1>

        <p className={styles.lead}>
          En VIAVIP cada perfil pasa por un proceso estricto de verificación para garantizar
          autenticidad, seguridad y máxima confianza dentro de la plataforma. Nuestro sistema de
          verificación de identidad y control de fotos reales asegura que los perfiles publicados
          en VIAVIP Uruguay sean genuinos, activos y mayores de edad.
        </p>

        <p className={styles.p}>
          La verificación es obligatoria para publicar y forma parte del estándar de calidad de VIAVIP.
          Este filtro reduce perfiles falsos, mejora la experiencia de navegación y aumenta la confianza
          de los usuarios que buscan perfiles reales en Montevideo, Punta del Este y todo Uruguay.
        </p>

        <p className={styles.p}>
          Gracias a este proceso, VIAVIP mantiene un entorno más seguro, con perfiles auténticos y mejor
          posicionados dentro de la plataforma.
        </p>

        <div className={styles.bullets} aria-label="Beneficios de la verificación">
          <div className={styles.bullet}>✔ Identidad verificada</div>
          <div className={styles.bullet}>✔ Fotos reales controladas</div>
          <div className={styles.bullet}>✔ Perfiles auténticos</div>
        </div>

        <div className={styles.ctaRow}>
          <div className={styles.microcopy}>Proceso privado • Datos protegidos • Verificación segura</div>
          <Link href="/publicar" className={styles.ctaBtn}>
            <span className={styles.ctaIcon} aria-hidden="true">🛡️</span>
            Publicar mi perfil
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-label="Preguntas frecuentes sobre verificación">
        <h2 className={styles.h2}>Preguntas frecuentes sobre verificación</h2>

        <div className={styles.faq}>
          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Qué significa “Perfil verificado” en VIAVIP?</summary>
            <div className={styles.faqA}>
              Significa que el perfil pasó por un proceso de validación de identidad y revisión de fotos
              para confirmar que se trata de una persona real y mayor de edad.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿La verificación es obligatoria para publicar?</summary>
            <div className={styles.faqA}>
              Sí. En VIAVIP la verificación es requisito obligatorio para mantener la calidad, seguridad
              y confianza dentro de la plataforma.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Qué se revisa durante la verificación?</summary>
            <div className={styles.faqA}>
              Se valida la identidad y se controlan fotos reales para reducir perfiles falsos y mejorar
              la calidad del sitio.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Cuánto demora la verificación del perfil?</summary>
            <div className={styles.faqA}>
              En la mayoría de los casos la verificación se procesa rápidamente una vez enviada la
              información requerida.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Mis datos son privados durante la verificación?</summary>
            <div className={styles.faqA}>
              Sí. VIAVIP utiliza procesos seguros y confidenciales para proteger la información durante
              todo el proceso.
            </div>
          </details>

          <details className={styles.faqItem}>
            <summary className={styles.faqQ}>¿Puedo actualizar mi perfil después de verificarme?</summary>
            <div className={styles.faqA}>
              Sí. Podés editar fotos, descripción y datos desde tu panel cuando quieras.
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
