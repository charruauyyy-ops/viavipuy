"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { toggleDisponible, deletePub } from "./actions";

interface Publicacion {
  id: string;
  nombre?: string;
  nombre_fantasia?: string;
  ciudad?: string;
  edad?: number;
  categoria?: string;
  disponible?: boolean;
  created_at?: string;
}

export default function AdminPublicacionesPage() {
  const router = useRouter();
  const [pubs, setPubs] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setAuthError("Supabase no configurado."); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: adminProfile } = await supabase
        .from("profiles").select("is_admin, rol").eq("id", user.id).maybeSingle();
      if (!adminProfile?.is_admin) { router.replace("/"); return; }

      const { data, error } = await supabase
        .from("publicaciones")
        .select("id, nombre, ciudad, edad, categoria, disponible, created_at")
        .order("created_at", { ascending: false });

      if (error) { setAuthError(`Error: ${error.message}`); }
      else { setPubs((data || []) as Publicacion[]); }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleToggle(id: string, currentDisponible: boolean) {
    setUpdating(id);
    setActionMsg(null);
    const result = await toggleDisponible(id, !currentDisponible);
    if (result.error) {
      setActionMsg({ id, type: "error", text: result.error });
    } else {
      setActionMsg({ id, type: "success", text: !currentDisponible ? "Publicacion activada" : "Publicacion suspendida" });
      setPubs((prev) => prev.map((p) => p.id === id ? { ...p, disponible: !currentDisponible } : p));
    }
    setUpdating(null);
  }

  async function handleDelete(id: string) {
    setUpdating(id);
    setActionMsg(null);
    const result = await deletePub(id);
    if (result.error) {
      setActionMsg({ id, type: "error", text: result.error });
    } else {
      setActionMsg({ id: "", type: "success", text: "Publicacion eliminada" });
      setPubs((prev) => prev.filter((p) => p.id !== id));
    }
    setConfirmDelete(null);
    setUpdating(null);
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

        <h1 data-testid="text-publicaciones-title" style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", letterSpacing: "0.3px" }}>
          Gestion de publicaciones
        </h1>
        <p style={{ color: "var(--text-secondary, #999999)", fontSize: "15px", marginBottom: "32px" }}>
          Administrar anuncios de usuarios &middot; {pubs.length} registro(s)
        </p>

        {actionMsg && actionMsg.id === "" && (
          <div style={{ padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", background: actionMsg.type === "success" ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.12)", color: actionMsg.type === "success" ? "#22c55e" : "#f87171", border: `1px solid ${actionMsg.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(220,38,38,0.25)"}` }}>
            {actionMsg.text}
          </div>
        )}

        {pubs.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-tertiary, #666666)", padding: "48px 20px", fontSize: "15px" }}>
            No hay publicaciones registradas.
          </div>
        )}

        {pubs.length > 0 && (
          <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid var(--border, #1e1e1e)" }}>
            <table data-testid="table-publicaciones" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated, #1a1a1a)", borderBottom: "1px solid var(--border, #1e1e1e)" }}>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Ciudad</th>
                  <th style={thStyle}>Edad</th>
                  <th style={thStyle}>Categoria</th>
                  <th style={thStyle}>Disponible</th>
                  <th style={thStyle}>Creado</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pubs.map((pub) => (
                  <tr key={pub.id} data-testid={`row-pub-${pub.id}`} style={{ borderBottom: "1px solid var(--border, #1e1e1e)", background: pub.disponible === false ? "rgba(220,38,38,0.04)" : "var(--bg-card, #141414)" }}>
                    <td style={tdStyle}>{pub.nombre || "—"}</td>
                    <td style={tdStyle}>{pub.ciudad || "—"}</td>
                    <td style={tdStyle}>{pub.edad ?? "—"}</td>
                    <td style={tdStyle}><span style={{ textTransform: "capitalize" }}>{pub.categoria || "—"}</span></td>
                    <td style={tdStyle}>
                      {pub.disponible !== false ? (
                        <span style={{ ...badgeBase, background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Si</span>
                      ) : (
                        <span style={{ ...badgeBase, background: "rgba(220,38,38,0.15)", color: "#f87171" }}>No</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {pub.created_at ? new Date(pub.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                        {actionMsg && actionMsg.id === pub.id && (
                          <span style={{ fontSize: "11px", color: actionMsg.type === "success" ? "#22c55e" : "#f87171" }}>
                            {actionMsg.text}
                          </span>
                        )}

                        {confirmDelete === pub.id ? (
                          <>
                            <span style={{ fontSize: "12px", color: "#f87171" }}>Confirmar eliminacion?</span>
                            <button style={btnDanger} disabled={updating === pub.id} onClick={() => handleDelete(pub.id)} data-testid={`button-confirm-delete-${pub.id}`}>
                              {updating === pub.id ? "..." : "Si, eliminar"}
                            </button>
                            <button style={btnGhost} onClick={() => setConfirmDelete(null)} data-testid={`button-cancel-delete-${pub.id}`}>
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              style={pub.disponible !== false ? btnSuspend : btnApprove}
                              disabled={updating === pub.id}
                              onClick={() => handleToggle(pub.id, pub.disponible !== false)}
                              data-testid={`button-toggle-${pub.id}`}
                            >
                              {updating === pub.id ? "..." : pub.disponible !== false ? "Suspender" : "Activar"}
                            </button>
                            <button style={btnDanger} disabled={updating === pub.id} onClick={() => setConfirmDelete(pub.id)} data-testid={`button-eliminar-${pub.id}`}>
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary, #666666)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", whiteSpace: "nowrap" };
const badgeBase: React.CSSProperties = { display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.3px" };
const btnBase: React.CSSProperties = { padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", transition: "opacity 0.15s", fontFamily: "inherit", letterSpacing: "0.2px", whiteSpace: "nowrap" };
const btnApprove: React.CSSProperties = { ...btnBase, background: "rgba(34,197,94,0.15)", color: "#22c55e" };
const btnSuspend: React.CSSProperties = { ...btnBase, background: "rgba(251,191,36,0.15)", color: "#fbbf24" };
const btnDanger: React.CSSProperties = { ...btnBase, background: "rgba(220,38,38,0.15)", color: "#f87171" };
const btnGhost: React.CSSProperties = { ...btnBase, background: "rgba(136,136,136,0.1)", color: "#999" };
