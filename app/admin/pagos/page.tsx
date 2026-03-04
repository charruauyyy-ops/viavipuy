"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

interface Pago {
  id: string;
  user_id: string;
  plan_id: string;
  duracion_dias: number;
  monto: number;
  metodo_pago: string;
  estado_pago: string;
  comprobante_url: string | null;
  usuario_email: string;
  usuario_nombre: string;
  created_at: string;
}

export default function AdminPagosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [tab, setTab] = useState<"pendiente" | "acreditado" | "rechazado">(
    "pendiente",
  );
  const [processing, setProcessing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = getSupabase();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, rol")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.is_admin && profile?.rol !== "admin") {
        router.replace("/");
        return;
      }
      setLoading(false);
    }
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    fetchPagos();
  }, [loading, tab]);

  async function fetchPagos() {
    try {
      const res = await fetch(`/api/admin/pagos?estado=${tab}`, {
        credentials: "include",
      });
      const data = await res.json();
      setPagos(data.pagos || []);
    } catch {
      setPagos([]);
    }
  }

  async function handleAction(
    pagoId: string,
    accion: "acreditar" | "rechazar",
  ) {
    if (
      !confirm(
        accion === "acreditar"
          ? "Aprobar este pago y activar el plan?"
          : "Rechazar este pago?",
      )
    )
      return;
    setProcessing(pagoId);
    try {
      await fetch("/api/admin/pagos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pago_id: pagoId, accion }),
        credentials: "include",
      });
      fetchPagos();
    } catch {}
    setProcessing(null);
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(198,167,94,0.2)",
            borderTop: "3px solid #c6a75e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const tabStyle = (t: string) => ({
    padding: "8px 18px",
    borderRadius: "999px",
    border: tab === t ? "1px solid #c6a75e" : "1px solid rgba(255,255,255,0.1)",
    background: tab === t ? "rgba(198,167,94,0.15)" : "transparent",
    color: tab === t ? "#c6a75e" : "rgba(255,255,255,0.6)",
    cursor: "pointer" as const,
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: "inherit",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "inherit",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <button
            onClick={() => router.push("/admin")}
            style={{
              background: "none",
              border: "none",
              color: "#c6a75e",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
            }}
            data-testid="link-admin-back"
          >
            Admin
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
          <h1
            data-testid="text-admin-pagos-title"
            style={{ fontSize: 24, fontWeight: 700, margin: 0 }}
          >
            Pagos
          </h1>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 14,
            marginBottom: 28,
          }}
        >
          Gestion de pagos de planes
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {(["pendiente", "acreditado", "rechazado"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={tabStyle(t)}
              data-testid={`tab-pagos-${t}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {pagos.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "rgba(255,255,255,0.4)",
              fontSize: 14,
            }}
          >
            No hay pagos {tab}s
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pagos.map((p) => (
              <div
                key={p.id}
                data-testid={`card-pago-${p.id}`}
                style={{
                  background: "#141414",
                  border: "1px solid #1e1e1e",
                  borderRadius: 10,
                  padding: "18px 20px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: "#f2f2f2",
                    }}
                  >
                    {p.usuario_nombre ||
                      p.usuario_email ||
                      p.user_id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {p.usuario_email}
                  </div>
                </div>

                <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#c6a75e",
                      textTransform: "uppercase",
                    }}
                  >
                    {p.plan_id}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    {p.duracion_dias} dias
                  </div>
                </div>

                <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                  <div
                    style={{ fontSize: 16, fontWeight: 700, color: "#f2f2f2" }}
                  >
                    ${p.monto}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    {p.metodo_pago}
                  </div>
                </div>

                <div style={{ flex: "0 0 auto", textAlign: "center" }}>
                  <div
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}
                  >
                    {new Date(p.created_at).toLocaleDateString("es-UY", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}
                  >
                    {new Date(p.created_at).toLocaleTimeString("es-UY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {p.comprobante_url ? (
                  <button
                    onClick={() => setLightbox(p.comprobante_url)}
                    data-testid={`btn-ver-comprobante-${p.id}`}
                    style={{
                      flex: "0 0 auto",
                      padding: "6px 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(198,167,94,0.3)",
                      background: "rgba(198,167,94,0.08)",
                      color: "#c6a75e",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Ver comprobante
                  </button>
                ) : ["abitab", "redpagos", "transferencia"].includes(
                    p.metodo_pago,
                  ) && tab === "pendiente" ? (
                  <span
                    style={{
                      flex: "0 0 auto",
                      fontSize: 11,
                      color: "rgba(255,80,80,0.7)",
                      fontWeight: 600,
                    }}
                  >
                    Sin comprobante
                  </span>
                ) : null}

                {tab === "pendiente" &&
                  (() => {
                    const isManual = [
                      "abitab",
                      "redpagos",
                      "transferencia",
                    ].includes(p.metodo_pago);
                    const canApprove = !isManual || !!p.comprobante_url;
                    return (
                      <div
                        style={{ flex: "0 0 auto", display: "flex", gap: 8 }}
                      >
                        <button
                          onClick={() => handleAction(p.id, "acreditar")}
                          disabled={processing === p.id || !canApprove}
                          title={!canApprove ? "Requiere comprobante" : ""}
                          data-testid={`btn-acreditar-${p.id}`}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "none",
                            background: canApprove
                              ? "linear-gradient(90deg, #22c55e, #16a34a)"
                              : "rgba(255,255,255,0.06)",
                            color: canApprove
                              ? "#fff"
                              : "rgba(255,255,255,0.3)",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: canApprove ? "pointer" : "not-allowed",
                            fontFamily: "inherit",
                            opacity: processing === p.id ? 0.5 : 1,
                          }}
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleAction(p.id, "rechazar")}
                          disabled={processing === p.id}
                          data-testid={`btn-rechazar-${p.id}`}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,80,80,0.3)",
                            background: "rgba(255,80,80,0.08)",
                            color: "#ff6b6b",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            opacity: processing === p.id ? 0.5 : 1,
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    );
                  })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "pointer",
            padding: 20,
          }}
        >
          <img
            src={lightbox}
            alt="Comprobante de pago"
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              borderRadius: 8,
              objectFit: "contain",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
