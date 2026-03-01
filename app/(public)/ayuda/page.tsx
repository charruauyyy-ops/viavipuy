export const metadata = {
  title: "Ayuda - VIAVIP",
  description: "Centro de ayuda de VIAVIP Uruguay.",
};

import Link from "next/link";
import styles from "./Ayuda.module.css";

const WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/59800000000";

export default function AyudaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-label="Centro de ayuda VIAVIP">
        <h1 className={styles.h1}>Centro de ayuda VIAVIP</h1>

        <p className={styles.lead}>
          Encontrá respuestas rápidas sobre tu cuenta, verificación, planes y uso seguro de VIAVIP.
        </p>

        <div className={styles.primaryCta}>
          <Link className={styles.supportBtn} href="/contacto">
            Contactar soporte
          </Link>
          <div className={styles.micro}>Respuesta habitual dentro de 24 h</div>
        </div>

        <div className={styles.urgent}>
          <div className={styles.urgentQ}>¿Es urgente?</div>
          <a
            className={styles.whatsLink}
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Escribinos por WhatsApp (solo urgencias)"
          >
            Escribinos por WhatsApp
          </a>
          <div className={styles.urgentHint}>WhatsApp es solo para urgencias, no canal principal.</div>
        </div>
      </section>

      <section className={styles.gridWrap} aria-label="Accesos rápidos">
        <h2 className={styles.h2}>Accesos rápidos</h2>

        <div className={styles.grid}>
          <Link className={styles.card} href="/publicar">
            <div className={styles.cardTitle}>Publicar perfil</div>
            <div className={styles.cardDesc}>Creá tu anuncio y activalo en minutos.</div>
          </Link>

          <Link className={styles.card} href="/verificacion-viavip">
            <div className={styles.cardTitle}>Verificación de cuenta</div>
            <div className={styles.cardDesc}>Validación para perfiles reales y más confianza.</div>
          </Link>

          <Link className={styles.card} href="/planes">
            <div className={styles.cardTitle}>Planes y beneficios</div>
            <div className={styles.cardDesc}>Conocé visibilidad, límites y ventajas por plan.</div>
          </Link>

          <Link className={styles.card} href="/reportar">
            <div className={styles.cardTitle}>Reportar perfil</div>
            <div className={styles.cardDesc}>Denunciá perfiles falsos o contenido inapropiado.</div>
          </Link>

          <Link className={styles.card} href="/como-funciona">
            <div className={styles.cardTitle}>Cómo funciona</div>
            <div className={styles.cardDesc}>Guía rápida para entender VIAVIP paso a paso.</div>
          </Link>

          <Link className={styles.card} href="/contacto">
            <div className={styles.cardTitle}>Contacto</div>
            <div className={styles.cardDesc}>Canal principal para soporte y consultas.</div>
          </Link>
        </div>
      </section>

      <section className={styles.trust} aria-label="Tiempo de respuesta">
        <h2 className={styles.h2}>Tiempo de respuesta</h2>
        <p className={styles.trustText}>
          Respondemos la mayoría de las consultas dentro de 24 horas hábiles. Para casos urgentes, utilizá
          el canal de WhatsApp prioritario.
        </p>
        <div className={styles.trustSmall}>Horario de atención: soporte activo todos los días.</div>
      </section>
    </main>
  );
}