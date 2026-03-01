export const metadata = {
  title: "Contacto - VIAVIP",
  description: "Contactá al equipo de VIAVIP Uruguay.",
};

import styles from "./Contacto.module.css";

const WHATSAPP_URL =
  process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/59895586378";

export default function ContactoPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.h1}>Contacto VIAVIP</h1>
        <p className={styles.lead}>
          Si tenés consultas, sugerencias o necesitás asistencia, podés
          comunicarte con el equipo de VIAVIP. Estamos para ayudarte con tu
          cuenta, verificación, planes o cualquier duda sobre la plataforma.
          Respondemos la mayoría de los mensajes dentro de 24 horas hábiles.
        </p>

        <div className={styles.trustMini}>
          <span>✔ Soporte oficial VIAVIP</span>
          <span>✔ Atención segura</span>
          <span>✔ Respuesta prioritaria</span>
        </div>
      </section>

      <section className={styles.formWrap}>
        <form>
          <div className={styles.field}>
            <label className={styles.label}>Nombre o alias (opcional)</label>
            <input className={styles.input} type="text" />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email de contacto</label>
            <input className={styles.input} type="email" required />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>¿Sobre qué necesitás ayuda?</label>
            <select className={styles.select}>
              <option>Consulta general</option>
              <option>Verificación</option>
              <option>Planes</option>
              <option>Reporte</option>
              <option>Otro</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Contanos brevemente tu consulta o problema
            </label>
            <textarea className={styles.textarea} minLength={10} required />
          </div>

          <button className={styles.submitBtn} type="submit">
            Enviar consulta
          </button>

          <div className={styles.micro}>Respuesta habitual dentro de 24 h.</div>
        </form>

        <div className={styles.urgent}>
          ¿Tu caso es urgente?{" "}
          <a
            className={styles.whats}
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
