"use client";

import { getSupabase } from "@/lib/supabaseClient";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
interface Profile {
  id: string;
  nombre?: string;
  categoria?: string;
  plan_actual?: string;
  plan_estado?: string;
  verification_status?: string;
  is_suspended?: boolean;
  is_admin?: boolean;
  created_at?: string;
  pub_nombre?: string;
  pub_categoria?: string;
}

type PlanType = "free" | "plus" | "platino" | "diamante";

export default function AdminPerfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState<{
    id: string;
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadProfiles = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthError("Supabase no configurado.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!adminProfile?.is_admin) {
      router.replace("/");
      return;
    }

    setAdminUserId(user.id);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, nombre, categoria, plan_actual, plan_estado, verification_status, is_suspended, is_admin, created_at, publicaciones(nombre, categoria)",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setAuthError(`Error: ${error.message}`);
    } else {
      const mapped = (data || []).map((p: Record<string, unknown>) => {
        const pub = Array.isArray(p.publicaciones) && p.publicaciones.length > 0
          ? (p.publicaciones as Record<string, unknown>[])[0]
          : (p.publicaciones && typeof p.publicaciones === "object" && !Array.isArray(p.publicaciones))
            ? (p.publicaciones as Record<string, unknown>)
            : null;
        return {
          ...p,
          pub_nombre: pub?.nombre as string | undefined,
          pub_categoria: pub?.categoria as string | undefined,
          publicaciones: undefined,
        } as unknown as Profile;
      });
      setProfiles(mapped);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return profiles;
    const q = search.toLowerCase().trim();
    return profiles.filter(
      (p) =>
        (p.pub_nombre || "").toLowerCase().includes(q) ||
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.categoria || "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [profiles, search]);
  async function adminCall(
    action: "setPlan" | "suspend" | "toggleAdmin",
    targetUserId: string,
    value: any,
  ) {
    const supabase = getSupabase();
    if (!supabase) return { error: "Supabase no configurado." };

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      return { error: "Sin sesión (token)" };
    }

    const res = await fetch("/admin/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, targetUserId, value }),
    });

    return res.json();
  }

  async function handleSetPlan(profileId: string, plan: PlanType) {
    setUpdating(profileId);
    setActionMsg(null);
    const result = await adminCall("setPlan", profileId, plan);
    if (result.error) {
      setActionMsg({ id: profileId, type: "error", text: result.error });
    } else {
      setActionMsg({
        id: profileId,
        type: "success",
        text: `Plan actualizado a ${plan}`,
      });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, plan_actual: plan, plan_estado: "activo" }
            : p,
        ),
      );
    }
    setUpdating(null);
  }

  async function handleToggleSuspend(
    profileId: string,
    currentlySuspended: boolean,
  ) {
    setUpdating(profileId);
    setActionMsg(null);
    const result = await adminCall("suspend", profileId, !currentlySuspended);
    if (result.error) {
      setActionMsg({ id: profileId, type: "error", text: result.error });
    } else {
      setActionMsg({
        id: profileId,
        type: "success",
        text: !currentlySuspended ? "Perfil suspendido" : "Perfil reactivado",
      });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, is_suspended: !currentlySuspended } : p,
        ),
      );
    }
    setUpdating(null);
  }

  async function handleToggleAdmin(profileId: string, currentlyAdmin: boolean) {
    setUpdating(profileId);
    setActionMsg(null);
    const result = await adminCall("toggleAdmin", profileId, !currentlyAdmin);
    if (result.error) {
      setActionMsg({ id: profileId, type: "error", text: result.error });
    } else {
      setActionMsg({
        id: profileId,
        type: "success",
        text: !currentlyAdmin ? "Admin activado" : "Admin removido",
      });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, is_admin: !currentlyAdmin } : p,
        ),
      );
    }
    setUpdating(null);
  }

  function getBadge(
    value: string | undefined,
    colorMap: Record<string, { bg: string; fg: string }>,
  ) {
    const v = value || "";
    const colors = colorMap[v] || { bg: "rgba(136,136,136,0.15)", fg: "#888" };
    return {
      display: "inline-block" as const,
      padding: "3px 10px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.3px",
      textTransform: "capitalize" as const,
      background: colors.bg,
      color: colors.fg,
    };
  }

  const planColors: Record<string, { bg: string; fg: string }> = {
    diamante: { bg: "rgba(198,167,94,0.15)", fg: "#c6a75e" },
    platino: { bg: "rgba(224,213,183,0.15)", fg: "#e0d5b7" },
    plus: { bg: "rgba(198,167,94,0.15)", fg: "#c6a75e" },
    free: { bg: "rgba(136,136,136,0.15)", fg: "#888" },
  };

  const estadoColors: Record<string, { bg: string; fg: string }> = {
    activo: { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" },
    suspendido: { bg: "rgba(220,38,38,0.15)", fg: "#f87171" },
    vencido: { bg: "rgba(251,191,36,0.15)", fg: "#fbbf24" },
  };

  const verifColors: Record<string, { bg: string; fg: string }> = {
    approved: { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" },
    in_review: { bg: "rgba(251,191,36,0.15)", fg: "#fbbf24" },
    pending: { bg: "rgba(136,136,136,0.15)", fg: "#888" },
    rejected: { bg: "rgba(220,38,38,0.15)", fg: "#f87171" },
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary, #0a0a0a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(198, 167, 94, 0.2)",
            borderTop: "3px solid var(--gold, #c6a75e)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary, #0a0a0a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ff6b6b",
          fontSize: "16px",
        }}
      >
        {authError}
      </div>
    );
  }

  const plans: PlanType[] = ["free", "plus", "platino", "diamante"];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary, #0a0a0a)",
        color: "var(--text-primary, #ffffff)",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "48px 20px",
        }}
      >
        <div
          style={{
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/admin"
            data-testid="link-back-admin"
            style={{
              color: "var(--gold, #c6a75e)",
              textDecoration: "none",
              fontSize: "14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Panel Admin
          </Link>
        </div>

        <h1
          data-testid="text-perfiles-title"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            marginBottom: "8px",
            letterSpacing: "0.3px",
          }}
        >
          Gestion de perfiles
        </h1>
        <p
          style={{
            color: "var(--text-secondary, #999999)",
            fontSize: "15px",
            marginBottom: "24px",
          }}
        >
          Administrar usuarios del sistema &middot; {profiles.length}{" "}
          registro(s)
        </p>

        <div style={{ marginBottom: "24px" }}>
          <input
            type="text"
            data-testid="input-search-perfiles"
            placeholder="Buscar por nombre, celular o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border, #1e1e1e)",
              background: "var(--bg-card, #141414)",
              color: "var(--text-primary, #ffffff)",
              fontSize: "14px",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          {search && (
            <span
              style={{
                marginLeft: "12px",
                color: "var(--text-tertiary, #666666)",
                fontSize: "13px",
              }}
            >
              {filtered.length} resultado(s)
            </span>
          )}
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-tertiary, #666666)",
              padding: "48px 20px",
              fontSize: "15px",
            }}
          >
            {search
              ? "No se encontraron perfiles con esa busqueda."
              : "No hay perfiles registrados."}
          </div>
        )}

        {filtered.length > 0 && (
          <div
            style={{
              overflowX: "auto",
              borderRadius: "10px",
              border: "1px solid var(--border, #1e1e1e)",
            }}
          >
            <table
              data-testid="table-perfiles"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
                minWidth: "1000px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-elevated, #1a1a1a)",
                    borderBottom: "1px solid var(--border, #1e1e1e)",
                  }}
                >
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Categoria</th>
                  <th style={thStyle}>Plan</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Verif.</th>
                  <th style={thStyle}>Susp.</th>
                  <th style={thStyle}>Creado</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    data-testid={`row-profile-${p.id}`}
                    style={{
                      borderBottom: "1px solid var(--border, #1e1e1e)",
                      background: p.is_suspended
                        ? "rgba(220, 38, 38, 0.04)"
                        : "var(--bg-card, #141414)",
                    }}
                  >
                    <td style={tdStyle}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {p.pub_nombre || p.nombre || "—"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-tertiary, #666)",
                            fontFamily: "monospace",
                          }}
                        >
                          {p.id.slice(0, 8)}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ textTransform: "capitalize" }}>
                        {p.categoria || p.pub_categoria || "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={getBadge(p.plan_actual || "free", planColors)}
                      >
                        {p.plan_actual || "free"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={getBadge(p.plan_estado, estadoColors)}>
                        {p.plan_estado || "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={getBadge(p.verification_status, verifColors)}
                      >
                        {p.verification_status || "—"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {p.is_suspended ? (
                        <span
                          style={{
                            color: "#f87171",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Si
                        </span>
                      ) : (
                        <span
                          style={{
                            color: "var(--text-tertiary, #666)",
                            fontSize: "13px",
                          }}
                        >
                          No
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        {actionMsg && actionMsg.id === p.id && (
                          <span
                            style={{
                              fontSize: "11px",
                              color:
                                actionMsg.type === "success"
                                  ? "#22c55e"
                                  : "#f87171",
                            }}
                          >
                            {actionMsg.text}
                          </span>
                        )}

                        <select
                          data-testid={`select-plan-${p.id}`}
                          value={p.plan_actual || "free"}
                          disabled={updating === p.id}
                          onChange={(e) =>
                            handleSetPlan(p.id, e.target.value as PlanType)
                          }
                          style={selectStyle}
                        >
                          {plans.map((plan) => (
                            <option key={plan} value={plan}>
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </option>
                          ))}
                        </select>

                        <button
                          style={p.is_suspended ? btnApprove : btnDanger}
                          disabled={updating === p.id}
                          onClick={() =>
                            handleToggleSuspend(p.id, !!p.is_suspended)
                          }
                          data-testid={`button-suspend-${p.id}`}
                        >
                          {updating === p.id
                            ? "..."
                            : p.is_suspended
                              ? "Reactivar"
                              : "Suspender"}
                        </button>

                        {p.id !== adminUserId && (
                          <button
                            style={p.is_admin ? btnDanger : btnGold}
                            disabled={updating === p.id}
                            onClick={() =>
                              handleToggleAdmin(p.id, !!p.is_admin)
                            }
                            data-testid={`button-admin-${p.id}`}
                          >
                            {updating === p.id
                              ? "..."
                              : p.is_admin
                                ? "Quitar Admin"
                                : "Hacer Admin"}
                          </button>
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

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: "11px",
  fontWeight: 600,
  color: "var(--text-tertiary, #666666)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  whiteSpace: "nowrap",
};

const btnBase: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  transition: "opacity 0.15s",
  fontFamily: "inherit",
  letterSpacing: "0.2px",
  whiteSpace: "nowrap",
};

const btnApprove: React.CSSProperties = {
  ...btnBase,
  background: "rgba(34, 197, 94, 0.15)",
  color: "#22c55e",
};

const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: "rgba(220, 38, 38, 0.15)",
  color: "#f87171",
};

const btnGold: React.CSSProperties = {
  ...btnBase,
  background: "rgba(198, 167, 94, 0.15)",
  color: "var(--gold, #c6a75e)",
};

const selectStyle: React.CSSProperties = {
  padding: "5px 8px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: 600,
  border: "1px solid var(--border, #1e1e1e)",
  background: "var(--bg-elevated, #1a1a1a)",
  color: "var(--text-primary, #ffffff)",
  cursor: "pointer",
  fontFamily: "inherit",
  outline: "none",
};
