"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

interface Notificacion {
  id: string;
  user_id: string;
  title: string;
  message: string;
  level: string;
  scope: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export default function AdminNotificacionesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = getSupabase();
      if (!supabase) return;

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

      setUserId(user.id);
      fetchNotificaciones(user.id);
    }
    init();
  }, [router]);

  async function fetchNotificaciones(uid: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("scope", "admin")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotificaciones(data);
    }
    setLoading(false);
  }

  async function handleVer(notif: Notificacion) {
    const supabase = getSupabase();
    if (!supabase) return;

    if (!notif.read_at) {
      await supabase
        .from("notificaciones")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notif.id);
      
      setNotificaciones(prev => 
        prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    }

    if (notif.entity_type === "admin_pago" || notif.entity_type === "admin_pago_pendiente") {
      router.push(`/admin/pagos?id=${notif.entity_id}`);
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

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", padding: "48px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => router.push("/admin")}
            style={{ background: "none", border: "none", color: "#c6a75e", cursor: "pointer", fontSize: 14 }}
          >
            Admin
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Notificaciones</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 32 }}>
          Inbox de alertas y avisos para administradores
        </p>

        {notificaciones.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#141414", borderRadius: 12, border: "1px solid #1e1e1e", color: "rgba(255,255,255,0.4)" }}>
            Sin notificaciones
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notificaciones.map((n) => (
              <div
                key={n.id}
                style={{
                  background: n.read_at ? "#111" : "#1a1a1a",
                  border: `1px solid ${n.read_at ? "#1e1e1e" : "rgba(198,167,94,0.3)"}`,
                  borderRadius: 12,
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  transition: "transform 0.2s",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: n.read_at ? "#ccc" : "#fff" }}>
                      {n.title}
                    </h3>
                    {!n.read_at && (
                      <span style={{ width: 8, height: 8, background: "#c6a75e", borderRadius: "50%" }} />
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => handleVer(n)}
                  style={{
                    background: "rgba(198,167,94,0.1)",
                    border: "1px solid #c6a75e",
                    color: "#c6a75e",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Ver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
