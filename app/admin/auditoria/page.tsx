"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

interface AuditEntry {
  id: string;
  created_at: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string;
  details: Record<string, unknown>;
}

export default function AdminAuditoriaPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setAuthError("Supabase no configurado."); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace("/"); return; }

      const { data, error } = await supabase
        .from("admin_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        if (error.message.includes("does not exist") || error.code === "42P01") {
          setTableExists(false);
        } else {
          setAuthError(`Error: ${error.message}`);
        }
      } else {
        setEntries((data || []) as AuditEntry[]);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const filteredEntries = filterAction
    ? entries.filter((e) => e.action.toLowerCase().includes(filterAction.toLowerCase()))
    : entries;

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

        <h1 data-testid="text-auditoria-title" style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", letterSpacing: "0.3px" }}>
          Auditoria
        </h1>
        <p style={{ color: "var(--text-secondary, #999999)", fontSize: "15px", marginBottom: "32px" }}>
          Registro de acciones administrativas
        </p>

        {!tableExists && (
          <div style={{ padding: "20px", borderRadius: "10px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
            <strong>Tabla de auditoria no encontrada.</strong><br />
            Para habilitar el registro de auditoria, ejecuta la siguiente consulta SQL en la consola de Supabase:
            <pre style={{ background: "rgba(0,0,0,0.4)", padding: "12px", borderRadius: "6px", marginTop: "12px", fontSize: "12px", overflowX: "auto", whiteSpace: "pre-wrap" }}>
{`CREATE TABLE IF NOT EXISTS public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  admin_id uuid,
  action text,
  target_table text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb
);`}
            </pre>
          </div>
        )}

        {tableExists && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <input
                data-testid="input-filter-action"
                type="text"
                placeholder="Filtrar por accion..."
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border, #1e1e1e)", background: "var(--bg-card, #141414)", color: "var(--text-primary, #ffffff)", fontSize: "14px", width: "260px", maxWidth: "100%", outline: "none", fontFamily: "inherit" }}
              />
            </div>

            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-tertiary, #666666)", padding: "48px 20px", fontSize: "15px" }}>
                No hay registros de auditoria.
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid var(--border, #1e1e1e)" }}>
                <table data-testid="table-auditoria" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "700px" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-elevated, #1a1a1a)", borderBottom: "1px solid var(--border, #1e1e1e)" }}>
                      <th style={thStyle}>Fecha</th>
                      <th style={thStyle}>Accion</th>
                      <th style={thStyle}>Tabla</th>
                      <th style={thStyle}>ID Target</th>
                      <th style={thStyle}>Admin ID</th>
                      <th style={thStyle}>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} data-testid={`row-audit-${entry.id}`} style={{ borderBottom: "1px solid var(--border, #1e1e1e)", background: "var(--bg-card, #141414)" }}>
                        <td style={tdStyle}>
                          {new Date(entry.created_at).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={tdStyle}>
                          <span style={{ ...badgeBase, background: actionColor(entry.action).bg, color: actionColor(entry.action).text }}>
                            {entry.action}
                          </span>
                        </td>
                        <td style={tdStyle}>{entry.target_table}</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>{entry.target_id?.substring(0, 8)}...</td>
                        <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px" }}>{entry.admin_id?.substring(0, 8)}...</td>
                        <td style={{ ...tdStyle, fontSize: "12px", color: "var(--text-tertiary, #666666)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {Object.keys(entry.details || {}).length > 0
                            ? JSON.stringify(entry.details)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function actionColor(action: string) {
  if (action.includes("eliminar") || action.includes("suspender") || action.includes("rechazar") || action.includes("quitar"))
    return { bg: "rgba(220,38,38,0.15)", text: "#f87171" };
  if (action.includes("activar") || action.includes("aprobar") || action.includes("hacer_admin") || action.includes("reactivar"))
    return { bg: "rgba(34,197,94,0.15)", text: "#22c55e" };
  return { bg: "rgba(96,165,250,0.15)", text: "#60a5fa" };
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-tertiary, #666666)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", whiteSpace: "nowrap" };
const badgeBase: React.CSSProperties = { display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.3px" };
