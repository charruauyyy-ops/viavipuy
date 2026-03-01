import { getSupabasePublicClient } from "@/lib/supabasePublic";
import Link from "next/link";

export const metadata = {
  title: "Perfiles denunciados - VIAVIP",
  description: "Perfiles reportados y verificados como fraudulentos en VIAVIP Uruguay.",
};

interface DenunciaRow {
  id: string;
  publicacion_id: string;
  motivo: string;
  zona: string | null;
  telefono_reportado: string | null;
  fecha_accion: string | null;
}

interface PubRow {
  id: string;
  nombre: string | null;
  cover_url: string | null;
  categoria: string | null;
  zona: string | null;
}

const cardStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #1e1e1e",
  borderRadius: 10,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  height: 180,
  objectFit: "cover",
  background: "#0a0a0a",
};

const bodyStyle: React.CSSProperties = {
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const tagStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(200,50,50,0.15)",
  color: "#e55",
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 4,
  letterSpacing: "0.02em",
};

const verifiedStyle: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(212,175,55,0.8)",
  marginTop: 4,
};

function profileHref(categoria: string | null, id: string) {
  if (categoria === "hombre") return `/hombres/${id}`;
  if (categoria === "trans") return `/trans/${id}`;
  return `/mujeres/${id}`;
}

export default async function DenunciadosPage() {
  const supabase = getSupabasePublicClient();

  let denuncias: (DenunciaRow & { pub: PubRow | null })[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("denuncias")
      .select("id, publicacion_id, motivo, zona, telefono_reportado, fecha_accion")
      .eq("verificado", true)
      .order("fecha_accion", { ascending: false, nullsFirst: false })
      .limit(50);

    if (data && data.length > 0) {
      const pubIds = [...new Set(data.map((d: DenunciaRow) => d.publicacion_id))];
      const { data: pubs } = await supabase
        .from("publicaciones")
        .select("id, nombre, cover_url, categoria, zona")
        .in("id", pubIds);

      const pubMap = new Map<string, PubRow>();
      (pubs || []).forEach((p: PubRow) => pubMap.set(p.id, p));

      denuncias = data.map((d: DenunciaRow) => ({ ...d, pub: pubMap.get(d.publicacion_id) || null }));
    }
  }

  return (
    <main style={{ padding: "40px 20px", maxWidth: 900, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "clamp(22px, 5vw, 28px)",
          fontWeight: 600,
          color: "#EAEAEA",
          marginBottom: 8,
        }}
        data-testid="text-denunciados-title"
      >
        Perfiles denunciados
      </h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
        Perfiles verificados como fraudulentos o que incumplieron las normas de VIAVIP.
      </p>

      {denuncias.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", padding: 48 }}>
          No hay perfiles denunciados en este momento.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {denuncias.map((d) => (
            <div key={d.id} style={cardStyle} data-testid={`card-denuncia-${d.publicacion_id}`}>
              {d.pub?.cover_url ? (
                <img src={d.pub.cover_url} alt="" style={imgStyle} />
              ) : (
                <div style={{ ...imgStyle, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
              )}
              <div style={bodyStyle}>
                <span style={tagStyle}>Perfil bloqueado</span>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>
                  {d.pub?.nombre || "Perfil"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  {d.motivo}
                </span>
                {d.telefono_reportado && (
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    Tel: {d.telefono_reportado}
                  </span>
                )}
                {d.fecha_accion && (
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                    Fecha: {d.fecha_accion}
                  </span>
                )}
                <span style={verifiedStyle}>Verificado por VIAVIP</span>
                {d.pub && (
                  <Link
                    href={profileHref(d.pub.categoria, d.pub.id)}
                    style={{ color: "rgba(212,175,55,0.7)", fontSize: 12, textDecoration: "none", marginTop: 4 }}
                    data-testid={`link-perfil-${d.publicacion_id}`}
                  >
                    Ver perfil →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
