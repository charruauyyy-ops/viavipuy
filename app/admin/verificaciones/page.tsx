"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { setVerifEstado } from "./actions";

interface Profile {
  id: string;
  categoria?: string;
  verification_status?: string;
  tipo_documento?: string;
  doc_frente_url?: string;
  doc_dorso_url?: string;
  selfie_url?: string;
  verified_at?: string;
}

export default function AdminVerificacionesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setAuthError("Supabase no configurado."); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: adminProfile } = await supabase
        .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!adminProfile?.is_admin) { router.replace("/"); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, categoria, verification_status, tipo_documento, doc_frente_url, doc_dorso_url, selfie_url, verified_at")
        .in("verification_status", ["in_review", "pending", "approved", "rejected"])
        .order("verified_at", { ascending: false });

      if (error) { setAuthError(`Error: ${error.message}`); }
      else { setProfiles((data || []) as Profile[]); }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleAction(profileId: string, action: "approved" | "rejected") {
    console.log(`Intentando ${action} para perfil: ${profileId}`);
    setUpdating(profileId);
    setActionMsg(null);
    try {
      const result = await setVerifEstado(profileId, action);
      console.log("Resultado de la acción:", result);
      if (result.error) {
        console.error("Error en setVerifEstado:", result.error);
        setActionMsg({ id: profileId, type: "error", text: result.error });
      } else {
        setActionMsg({ id: profileId, type: "success", text: action === "approved" ? "Aprobado" : "Rechazado" });
        setProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, verification_status: action } : p));
      }
    } catch (e) {
      console.error("Error catastrofico en handleAction:", e);
      setActionMsg({ id: profileId, type: "error", text: "Error inesperado en el servidor." });
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid rgba(198, 167, 94, 0.2)", borderTop: "3px solid var(--gold, #c6a75e)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff6b6b", fontSize: "16px" }}>
        {authError}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", color: "var(--text-primary, #ffffff)", fontFamily: "inherit" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ marginBottom: "32px" }}>
          <Link href="/admin" data-testid="link-back-admin" style={{ color: "var(--gold, #c6a75e)", textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
            Panel Admin
          </Link>
        </div>

        <h1 data-testid="text-verificaciones-title" style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", letterSpacing: "0.3px" }}>
          Verificaciones
        </h1>
        <p style={{ color: "var(--text-secondary, #999999)", fontSize: "15px", marginBottom: "8px" }}>
          Moderacion de perfiles &middot; {profiles.length} registro(s)
        </p>
        <p style={{ color: "var(--text-tertiary, #666666)", fontSize: "13px", marginBottom: "32px" }}>
          La verificacion es automatica por email. Este panel es solo para moderacion manual.
        </p>

        {profiles.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-tertiary, #666666)", padding: "48px 20px", fontSize: "15px" }}>
            No hay verificaciones pendientes.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              data-testid={`card-verif-${p.id}`}
              style={{
                background: "var(--bg-card, #141414)",
                border: "1px solid var(--border, #1e1e1e)",
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
                <span style={{ fontSize: "15px", fontWeight: 500 }}>{p.categoria ? p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1) + " - " : ""}{p.id.substring(0, 8)}</span>
                <span style={{ ...badgeBase, ...verifColor(p.verification_status) }}>
                  {p.verification_status}
                </span>
              </div>

              {p.tipo_documento && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary, #999999)", margin: "0 0 4px" }}>
                  Documento: {p.tipo_documento}
                </p>
              )}
              {p.verified_at && (
                <p style={{ fontSize: "13px", color: "var(--text-secondary, #999999)", margin: "0 0 12px" }}>
                  Fecha: {new Date(p.verified_at).toLocaleString("es-AR")}
                </p>
              )}

              {/* Document images */}
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                {p.doc_frente_url && (
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--text-tertiary, #666666)", marginBottom: "4px" }}>Frente</p>
                    <a href={p.doc_frente_url} target="_blank" rel="noreferrer">
                      <img src={p.doc_frente_url} alt="Frente" style={imgStyle} />
                    </a>
                  </div>
                )}
                {p.doc_dorso_url && (
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--text-tertiary, #666666)", marginBottom: "4px" }}>Dorso</p>
                    <a href={p.doc_dorso_url} target="_blank" rel="noreferrer">
                      <img src={p.doc_dorso_url} alt="Dorso" style={imgStyle} />
                    </a>
                  </div>
                )}
                {p.selfie_url && (
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--text-tertiary, #666666)", marginBottom: "4px" }}>Selfie</p>
                    <a href={p.selfie_url} target="_blank" rel="noreferrer">
                      <img src={p.selfie_url} alt="Selfie" style={imgStyle} />
                    </a>
                  </div>
                )}
              </div>

              {actionMsg && actionMsg.id === p.id && (
                <div style={{ padding: "8px 14px", borderRadius: "8px", marginBottom: "10px", fontSize: "13px", background: actionMsg.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.12)", color: actionMsg.type === "success" ? "#22c55e" : "#f87171", border: `1px solid ${actionMsg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(220,38,38,0.25)"}` }}>
                  {actionMsg.text}
                </div>
              )}

              {(p.verification_status === "in_review" || p.verification_status === "pending") && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={btnApprove} disabled={updating === p.id} onClick={() => handleAction(p.id, "approved")} data-testid={`button-approve-${p.id}`}>
                    {updating === p.id ? "..." : "Aprobar"}
                  </button>
                  <button style={btnReject} disabled={updating === p.id} onClick={() => handleAction(p.id, "rejected")} data-testid={`button-reject-${p.id}`}>
                    {updating === p.id ? "..." : "Rechazar"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function verifColor(estado?: string) {
  switch (estado) {
    case "approved": return { background: "rgba(34,197,94,0.15)", color: "#22c55e" };
    case "rejected": return { background: "rgba(220,38,38,0.15)", color: "#f87171" };
    case "in_review": return { background: "rgba(251,191,36,0.15)", color: "#fbbf24" };
    default: return { background: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  }
}

const badgeBase: React.CSSProperties = { display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.3px", textTransform: "capitalize" };
const imgStyle: React.CSSProperties = { width: "100px", height: "70px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border, #1e1e1e)", cursor: "pointer" };
const btnBase: React.CSSProperties = { padding: "7px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", transition: "opacity 0.15s", fontFamily: "inherit", letterSpacing: "0.2px" };
const btnApprove: React.CSSProperties = { ...btnBase, background: "rgba(34,197,94,0.15)", color: "#22c55e" };
const btnReject: React.CSSProperties = { ...btnBase, background: "rgba(220,38,38,0.15)", color: "#f87171" };
