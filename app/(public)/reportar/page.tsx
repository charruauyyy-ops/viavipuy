export const metadata = {
  title: "Reportar perfil - VIAVIP",
  description: "Reportá un perfil sospechoso o contenido inapropiado en VIAVIP.",
};

import styles from "./ReportarPage.module.css";

const FAQ = [
  {
    q: "¿Qué pasa después de enviar un reporte?",
    a: "El equipo revisa el caso manualmente. Si corresponde, se toman acciones como revisión, bloqueo o suspensión del perfil.",
  },
  {
    q: "¿El reporte es anónimo?",
    a: "Sí. Tu reporte es confidencial. Si dejás un contacto, se usa solo si necesitamos aclaraciones.",
  },
  {
    q: "¿Qué información ayuda más?",
    a: "El link del perfil y una descripción clara del motivo. Si es URGENTE (menor de edad, extorsión o riesgo), usá el canal urgente.",
  },
];

export default function ReportarPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>Reportar perfil VIAVIP</h1>
        <p className={styles.lead}>
          Si encontrás un perfil sospechoso, falso o con contenido inapropiado, podés reportarlo desde aquí.
          Revisamos cada reporte para mantener la plataforma segura, confiable y con perfiles reales.
        </p>

        <div className={styles.heroCtas}>
          <a className={styles.ctaPrimary} href="/publicar" aria-label="Publicar mi perfil">
            Publicar perfil
          </a>
          <a className={styles.ctaSecondary} href="#form" aria-label="Ir al formulario de reporte">
            Reportar ahora
          </a>
        </div>

        <div className={styles.badges} aria-label="Beneficios">
          <span className={styles.badge}>Confidencial</span>
          <span className={styles.badge}>Revisión manual</span>
          <span className={styles.badge}>Acción rápida</span>
        </div>
      </header>

      <section className={styles.grid}>
        <section className={styles.card} id="form" aria-label="Formulario de reporte">
          <h2 className={styles.h2}>Formulario</h2>
          <p className={styles.muted}>
            Tu reporte es privado. Evitá compartir datos personales sensibles (documentos, direcciones, etc.).
          </p>

          <form className={styles.form} method="post" action="/api/reportes">
            <label className={styles.label}>
              Motivo
              <select name="motivo" className={styles.input} required defaultValue="">
                <option value="" disabled>
                  Seleccioná un motivo
                </option>
                <option value="perfil_falso">Perfil falso o suplantación</option>
                <option value="estafa_extorsion">Estafa o extorsión</option>
                <option value="menor_edad">Menor de edad (URGENTE)</option>
                <option value="ilegal_inapropiado">Contenido ilegal o inapropiado</option>
                <option value="spam_publicidad">Spam o publicidad</option>
                <option value="otro">Otro</option>
              </select>
            </label>

            <label className={styles.label}>
              Link del perfil
              <input
                name="link_perfil"
                className={styles.input}
                type="url"
                placeholder="https://viavip.../mujeres/123"
                required
                inputMode="url"
              />
            </label>

            <label className={styles.label}>
              Detalles (opcional, recomendado)
              <textarea
                name="detalles"
                className={`${styles.input} ${styles.textarea}`}
                placeholder="Contanos qué pasó y por qué lo reportás. Mientras más claro, más rápido actuamos."
                rows={6}
              />
            </label>

            <label className={styles.label}>
              Contacto (opcional)
              <input
                name="contacto"
                className={styles.input}
                type="text"
                placeholder="WhatsApp o email (solo si querés que te contactemos)"
                autoComplete="off"
              />
            </label>

            <label className={styles.checkboxRow}>
              <input name="confirmo" type="checkbox" required />
              <span>Confirmo que mi reporte es real y entiendo que el uso abusivo puede ser bloqueado.</span>
            </label>

            <button className={styles.submit} type="submit">
              Enviar reporte
            </button>

            <p className={styles.note}>
              Si es una situación crítica (menor de edad, riesgo o extorsión), usá el canal urgente.
            </p>

            <a
              className={styles.urgent}
              href="https://wa.me/0000000000?text=VIAVIP%20URGENTE%20-%20Necesito%20reportar%20un%20caso%20cr%C3%ADtico.%20Link%20del%20perfil%3A%20"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp urgente
            </a>
          </form>
        </section>

        <aside className={styles.card} aria-label="Cómo funciona el reporte">
          <h2 className={styles.h2}>Cómo funciona</h2>
          <ol className={styles.steps}>
            <li>Enviás el reporte con el motivo y el link del perfil.</li>
            <li>El equipo revisa el caso manualmente.</li>
            <li>Si corresponde, se toma acción (revisión, bloqueo o suspensión).</li>
          </ol>

          <div className={styles.divider} />

          <h2 className={styles.h2}>Preguntas frecuentes</h2>
          <div className={styles.faq}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className={styles.faqQ}>{item.q}</summary>
                <div className={styles.faqA}>{item.a}</div>
              </details>
            ))}
          </div>
        </aside>
      </section>

      {/* SEO: FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </main>
  );
}
