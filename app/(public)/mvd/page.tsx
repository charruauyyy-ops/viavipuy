import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Escorts en Montevideo VIP | Perfiles Verificados | VIAVIP",
  description:
    "Descubrí escorts en Montevideo con perfiles verificados, contacto directo y enfoque premium. Ingresá a VIAVIP y explorá acompañantes VIP en Montevideo.",
};

export default function EscortsMontevideoSeoPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ fontSize: "clamp(32px,5vw,52px)", marginBottom: 16 }}>
        Escorts VIP en Montevideo
      </h1>

      <p style={{ fontSize: 18, lineHeight: 1.6, color: "#cfcfcf" }}>
        En VIAVIP encontrás escorts en Montevideo con perfiles verificados,
        contacto directo y una experiencia premium pensada para quienes buscan
        discreción, confianza y atención de nivel.
      </p>

      <p style={{ fontSize: 16, lineHeight: 1.7, color: "#b5b5b5", marginTop: 12 }}>
        Si estás buscando escorts VIP en Montevideo o acompañantes en Montevideo
        dentro de una plataforma cuidada, VIAVIP te ofrece una alternativa más
        ordenada, visual y directa para coordinar rápido y seguro.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link
          href="/mvd"
          style={{
            display: "inline-block",
            padding: "14px 22px",
            borderRadius: 12,
            background: "#c6a75e",
            color: "#000",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Ver escorts en Montevideo
        </Link>
      </div>
    </main>
  );
}
