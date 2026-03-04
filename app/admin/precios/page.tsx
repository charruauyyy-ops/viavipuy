"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

interface PublicacionPrecio {
  id: string;
  duracion_dias: number;
  precio_uyu: number;
  activo: boolean;
}

interface PlanCatalogo {
  id: string;
  plan: string;
  duracion_dias: number;
  precio_uyu: number;
  activo: boolean;
}

export default function AdminPreciosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [publicacionPrecios, setPublicacionPrecios] = useState<PublicacionPrecio[]>([]);
  const [planesCatalogo, setPlanesCatalogo] = useState<PlanCatalogo[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = getSupabase();
      if (!supabase) {
        setAuthError("Supabase no configurado.");
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }

      await fetchData();
      setLoading(false);
    }
    checkAdmin();
  }, [router]);

  async function authFetch(url: string, options: RequestInit = {}) {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase no configurado");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAuthError("No hay sesión");
      throw new Error("No hay sesión");
    }
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
  }

  async function fetchData() {
    try {
      const res = await authFetch("/api/admin/precios");
      const data = await res.json();
      if (data.publicaciones) setPublicacionPrecios(data.publicaciones);
      if (data.planes) setPlanesCatalogo(data.planes);
    } catch (err) {
      console.error("Error fetching prices:", err);
    }
  }

  async function savePublicacionPrecio(id: string, nuevoPrecio: number) {
    setSaving(`pub-${id}`);
    try {
      const res = await authFetch("/api/admin/precios", {
        method: "PATCH",
        body: JSON.stringify({ tipo: "publicacion", id, precio_uyu: nuevoPrecio }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      alert("Precio de publicación actualizado");
    } catch (err) {
      alert("Error al guardar precio");
    } finally {
      setSaving(null);
    }
  }

  async function savePlanPrecio(id: string, nuevoPrecio: number, nuevoActivo: boolean) {
    setSaving(`plan-${id}`);
    try {
      const res = await authFetch("/api/admin/precios", {
        method: "PATCH",
        body: JSON.stringify({ tipo: "plan", id, precio_uyu: nuevoPrecio, activo: nuevoActivo }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      alert("Precio de plan actualizado");
    } catch (err) {
      alert("Error al guardar precio");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(198,167,94,0.2)", borderTop: "3px solid #c6a75e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const inputStyle = {
    background: "#1a1a1a",
    border: "1px solid #333",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "6px",
    width: "100px",
    fontSize: "14px",
  };

  const tableHeaderStyle = {
    textAlign: "left" as const,
    padding: "12px 16px",
    borderBottom: "1px solid #1e1e1e",
    color: "#999",
    fontSize: "13px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  };

  const tableCellStyle = {
    padding: "16px",
    borderBottom: "1px solid #1e1e1e",
    fontSize: "14px",
  };

  const btnStyle = {
    background: "var(--gold, #c6a75e)",
    color: "#000",
    border: "none",
    padding: "6px 16px",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "48px 20px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => router.push("/admin")}
            style={{ background: "none", border: "none", color: "#c6a75e", cursor: "pointer", fontSize: 14 }}
          >
            Admin
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>Precios</h1>
        </div>
        <p style={{ color: "#999", fontSize: "15px", marginBottom: "40px" }}>
          Administrar precios de publicaciones y suscripciones
        </p>

        {/* BLOQUE 1: PUBLICACIONES */}
        <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "12px", marginBottom: "40px", overflow: "hidden" }}>
          <div style={{ padding: "24px", borderBottom: "1px solid #1e1e1e" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Precios de Publicaciones</h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Duración</th>
                <th style={tableHeaderStyle}>Precio (UYU)</th>
                <th style={tableHeaderStyle}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {publicacionPrecios.map((p) => (
                <tr key={p.id}>
                  <td style={tableCellStyle}>{p.duracion_dias} días</td>
                  <td style={tableCellStyle}>
                    <input
                      type="number"
                      style={inputStyle}
                      defaultValue={p.precio_uyu}
                      onChange={(e) => (p.precio_uyu = Number(e.target.value))}
                    />
                  </td>
                  <td style={tableCellStyle}>
                    <button
                      style={{ ...btnStyle, opacity: saving === `pub-${p.id}` ? 0.5 : 1 }}
                      disabled={saving === `pub-${p.id}`}
                      onClick={() => savePublicacionPrecio(p.id, p.precio_uyu)}
                    >
                      {saving === `pub-${p.id}` ? "Guardando..." : "Guardar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BLOQUE 2: PLANES */}
        <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "24px", borderBottom: "1px solid #1e1e1e" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>Precios de Planes</h2>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Plan</th>
                <th style={tableHeaderStyle}>Duración</th>
                <th style={tableHeaderStyle}>Precio (UYU)</th>
                <th style={tableHeaderStyle}>Activo</th>
                <th style={tableHeaderStyle}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {planesCatalogo.map((p) => (
                <tr key={p.id}>
                  <td style={tableCellStyle}>{p.plan}</td>
                  <td style={tableCellStyle}>{p.duracion_dias} días</td>
                  <td style={tableCellStyle}>
                    <input
                      type="number"
                      style={inputStyle}
                      defaultValue={p.precio_uyu}
                      onChange={(e) => (p.precio_uyu = Number(e.target.value))}
                    />
                  </td>
                  <td style={tableCellStyle}>
                    <input
                      type="checkbox"
                      defaultChecked={p.activo}
                      onChange={(e) => (p.activo = e.target.checked)}
                      style={{ cursor: "pointer", width: "18px", height: "18px" }}
                    />
                  </td>
                  <td style={tableCellStyle}>
                    <button
                      style={{ ...btnStyle, opacity: saving === `plan-${p.id}` ? 0.5 : 1 }}
                      disabled={saving === `plan-${p.id}`}
                      onClick={() => savePlanPrecio(p.id, p.precio_uyu, p.activo)}
                    >
                      {saving === `plan-${p.id}` ? "Guardando..." : "Guardar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
