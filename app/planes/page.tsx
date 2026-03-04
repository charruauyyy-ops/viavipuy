"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { PLANS, PLAN_ORDER, getPlanPrice } from "@/lib/plans";
import styles from "./Planes.module.css";

type DurationKey = 7 | 30 | 90;
type MetodoPago = "mercadopago" | "abitab" | "redpagos" | "transferencia";
type ModalStep = "metodo" | "instrucciones" | "procesando";

const METODOS: { id: MetodoPago; label: string }[] = [
  { id: "mercadopago", label: "MercadoPago" },
  { id: "abitab", label: "Abitab" },
  { id: "redpagos", label: "RedPagos" },
  { id: "transferencia", label: "Transferencia bancaria" },
];

const INSTRUCCIONES: Record<string, { titulo: string; pasos: string[] }> = {
  abitab: {
    titulo: "Pago en Abitab",
    pasos: [
      "Acercate a cualquier local Abitab",
      "Indica que queres hacer un pago a Jonathan David Semelman Fontaine",
      "Cédula: 37884659",
      "Monto indicado abajo",
      "Guarda el comprobante y subilo aca",
    ],
  },
  redpagos: {
    titulo: "Pago en RedPagos",
    pasos: [
      "Acercate a cualquier local RedPagos",
      "Indica que queres hacer un pago a Jonathan David Semelman Fontaine",
      "Cédula: 37884659",
      "Monto indicado abajo",
      "Guarda el comprobante y subilo aca",
    ],
  },
  transferencia: {
    titulo: "Transferencia bancaria",
    pasos: [
      "Realiza una transferencia Por Prex:",
      "Cuenta: 21657689",
      "Nombre: Jonathan Semelman",
      "Concepto: tu email de registro",
      "Subi el comprobante de la transferencia aca",
    ],
  },
};

const PLAN_IMAGES: Record<
  "plus" | "platino" | "diamante",
  Record<DurationKey, string>
> = {
  plus: {
    7: "/planes/plus-7.png",
    30: "/planes/plus-30.png",
    90: "/planes/plus-90.png",
  },
  platino: {
    7: "/planes/platino-7.png",
    30: "/planes/platino-30.png",
    90: "/planes/platino-90.png",
  },
  diamante: {
    7: "/planes/diamante-7.png",
    30: "/planes/diamante-30.png",
    90: "/planes/diamante-90.png",
  },
};

export default function PlanesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<any[]>([]);

  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [planEstado, setPlanEstado] = useState<string>("sin_plan");
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<DurationKey>(30);

  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("metodo");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedMetodo, setSelectedMetodo] = useState<MetodoPago | null>(null);
  const [pagoId, setPagoId] = useState<string | null>(null);
  const [processingPago, setProcessingPago] = useState(false);
  const [uploadingComprobante, setUploadingComprobante] = useState(false);
  const [comprobanteUploaded, setComprobanteUploaded] = useState(false);
  const [pagoError, setPagoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [flashMsg, setFlashMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const pagoStatus = searchParams.get("pago");
    if (pagoStatus === "ok") {
      setFlashMsg({
        type: "success",
        text: "Pago procesado correctamente. Tu plan sera activado en breve.",
      });
    } else if (pagoStatus === "error") {
      setFlashMsg({
        type: "error",
        text: "Hubo un problema con tu pago. Intenta nuevamente.",
      });
    } else if (pagoStatus === "pendiente") {
      setFlashMsg({
        type: "success",
        text: "Tu pago esta pendiente de acreditacion. Te notificaremos cuando se active.",
      });
    }
  }, [searchParams]);

  // Helper: fetch que manda Authorization para que los route handlers puedan validar session aunque sea localStorage.
  async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});

    const supabase = getSupabase();
    const sessionRes = supabase ? await supabase.auth.getSession() : null;
    const token = sessionRes?.data?.session?.access_token?.trim();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.delete("Authorization");
    }

    const isFormData = init.body instanceof FormData;

    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  }

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Trae session + user desde el cliente (localStorage)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || null;
      setSessionToken(token);

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_actual, plan_estado")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setCurrentPlan(profile.plan_actual || "free");
        setPlanEstado(profile.plan_estado || "sin_plan");
      }

      setLoading(false);
    }
    load();
  }, []);

  async function fetchCatalogo() {
    try {
      const res = await fetch("/api/planes/catalogo", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCatalogo(data);
      }
    } catch (err) {
      console.error("Error fetching catalogo:", err);
    }
  }

  useEffect(() => {
    fetchCatalogo();
  }, []);

  function getPrecio(plan: string, dias: number) {
    const item = catalogo.find(
      (p: any) =>
        p.plan.toLowerCase() === plan.toLowerCase() && p.duracion_dias === dias,
    );
    return item ? item.precio_uyu : 0;
  }

  function handleActivate(planId: string) {
    setSelectedPlan(planId);
    setSelectedMetodo(null);
    setModalStep("metodo");
    setPagoId(null);
    setPagoError(null);
    setComprobanteUploaded(false);
    setShowModal(true);
  }

  async function handleSelectMetodo(metodo: MetodoPago) {
    if (!selectedPlan || !userId) return;

    setSelectedMetodo(metodo);
    setProcessingPago(true);
    setPagoError(null);

    if (metodo === "mercadopago") {
      setModalStep("procesando");
      try {
        const res = await authFetch("/api/pagos/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id: selectedPlan,
            duracion_dias: duration,
          }),
        });
        const data = await res.json();
        if (data.init_point) {
          window.location.href = data.init_point;
          return;
        }
        setPagoError(data.error || "Error al procesar pago");
        setModalStep("metodo");
      } catch {
        setPagoError("Error de conexion");
        setModalStep("metodo");
      }
      setProcessingPago(false);
      return;
    }

    try {
      const res = await authFetch("/api/pagos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlan,
          duracion_dias: duration,
          metodo_pago: metodo,
        }),
      });
      const data = await res.json();

      if (data.pago_id) {
        setPagoId(data.pago_id);
        setModalStep("instrucciones");
      } else {
        setPagoError(data.error || "Error al crear pago");
      }
    } catch {
      setPagoError("Error de conexion");
    }

    setProcessingPago(false);
  }

  async function handleUploadComprobante() {
    if (!fileInputRef.current?.files?.[0] || !pagoId) return;

    setUploadingComprobante(true);
    setPagoError(null);

    try {
      const formData = new FormData();
      formData.append("pago_id", pagoId);
      formData.append("comprobante", fileInputRef.current.files[0]);

      const res = await authFetch("/api/pagos/comprobante", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.ok) setComprobanteUploaded(true);
      else setPagoError(data.error || "Error al subir comprobante");
    } catch {
      setPagoError("Error de conexion");
    }

    setUploadingComprobante(false);
  }

  const durationTabs = useMemo(
    () =>
      [
        { key: 7 as const, label: "7 dias" },
        { key: 30 as const, label: "30 dias" },
        { key: 90 as const, label: "3 meses" },
      ] as const,
    [],
  );

  const selectedPlanPrice = selectedPlan
    ? getPrecio(selectedPlan, duration)
    : 0;

  function formatPrice(n: number) {
    return n >= 1000
      ? `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, "0")}`
      : String(n);
  }

  return (
    <main className="vv-form-page">
      <div className="vv-planes-container">
        <div className="vv-form-header" style={{ textAlign: "center" }}>
          <h1 className="vv-form-title">Planes</h1>
          <p className="vv-form-subtitle">
            Elegi tu duracion y activa el plan que te da mas exposicion.
          </p>

          <div className={styles.durationTabs}>
            {durationTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setDuration(t.key)}
                className={`${styles.durationTab} ${duration === t.key ? styles.durationTabActive : ""}`}
                data-testid={`btn-duration-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {!loading && !userId && (
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto 20px",
              padding: "14px 18px",
              borderRadius: 10,
              fontSize: 14,
              textAlign: "center",
              background: "rgba(198,167,94,0.06)",
              border: "1px solid rgba(198,167,94,0.18)",
              color: "rgba(255,255,255,0.7)",
            }}
            data-testid="text-login-cta"
          >
            <a
              href="/login?returnTo=/planes"
              style={{
                color: "#c6a75e",
                fontWeight: 700,
                textDecoration: "underline",
              }}
              data-testid="link-login-planes"
            >
              Inicia sesion
            </a>{" "}
            para activar un plan.
          </div>
        )}

        {flashMsg && (
          <div
            style={{
              maxWidth: 600,
              margin: "0 auto 20px",
              padding: "14px 18px",
              borderRadius: 10,
              fontSize: 14,
              textAlign: "center",
              background:
                flashMsg.type === "success"
                  ? "rgba(80,200,120,0.08)"
                  : "rgba(255,80,80,0.08)",
              border: `1px solid ${
                flashMsg.type === "success"
                  ? "rgba(80,200,120,0.2)"
                  : "rgba(255,80,80,0.2)"
              }`,
              color:
                flashMsg.type === "success"
                  ? "rgba(80,200,120,0.92)"
                  : "rgba(255,80,80,0.92)",
            }}
            data-testid="text-flash-msg"
          >
            {flashMsg.text}
          </div>
        )}

        <div className={styles.grid}>
          {PLAN_ORDER.filter((p) => p !== "free").map((planId) => {
            const plan = PLANS[planId];
            const isCurrent = currentPlan === planId && planEstado === "activo";

            return (
              <div
                key={planId}
                className={`${styles.card} ${planId === "diamante" ? styles.featured : ""}`}
              >
                <img
                  src={
                    PLAN_IMAGES[planId as "plus" | "platino" | "diamante"][
                      duration
                    ]
                  }
                  alt={`Plan ${plan.name}`}
                  className={styles.planImage}
                />

                {isCurrent ? (
                  <div className={styles.currentPlan}>Plan actual</div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#c6a75e",
                        textAlign: "center",
                        marginBottom: "10px",
                      }}
                    >
                      ${formatPrice(getPrecio(planId, duration))} /{" "}
                      {duration === 90 ? "3 meses" : `${duration} días`}
                    </div>
                    <button
                      className="vv-btn vv-plan-btn"
                      disabled={loading || !userId}
                      onClick={() => handleActivate(planId)}
                      data-testid={`btn-activar-${planId}`}
                    >
                      {!userId
                        ? "Inicia sesion"
                        : currentPlan === planId && planEstado === "vencido"
                          ? "Renovar"
                          : "Activar plan"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            if (!processingPago) setShowModal(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#141414",
              border: "1px solid rgba(198,167,94,0.25)",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: "28px 24px",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              disabled={processingPago}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                fontSize: 20,
                cursor: "pointer",
                lineHeight: 1,
              }}
              data-testid="btn-close-modal"
            >
              x
            </button>

            {modalStep === "metodo" && (
              <>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#f2f2f2",
                    marginBottom: 4,
                  }}
                >
                  Formas de pago
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: 20,
                  }}
                >
                  Plan {selectedPlan ? PLANS[selectedPlan]?.name : ""} -{" "}
                  {duration === 90 ? "3 meses" : `${duration} dias`} - $
                  {formatPrice(selectedPlanPrice)} UYU
                </p>

                {pagoError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(255,80,80,0.08)",
                      border: "1px solid rgba(255,80,80,0.2)",
                      color: "#ff6b6b",
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    {pagoError}
                  </div>
                )}

                {!userId ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: 14,
                        marginBottom: 16,
                      }}
                    >
                      Necesitas iniciar sesion para realizar el pago.
                    </p>
                    <a
                      href="/login?returnTo=/planes"
                      data-testid="link-login-modal"
                      style={{
                        display: "inline-block",
                        padding: "12px 28px",
                        borderRadius: 10,
                        background:
                          "linear-gradient(90deg, #b68a2a, #f3d77d, #b68a2a)",
                        color: "#131313",
                        fontSize: 14,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Iniciar sesion
                    </a>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {METODOS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMetodo(m.id)}
                        disabled={processingPago}
                        data-testid={`btn-metodo-${m.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 18px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "rgba(255,255,255,0.03)",
                          color: "#f2f2f2",
                          cursor: "pointer",
                          fontSize: 15,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          transition: "border-color 0.15s, background 0.15s",
                          opacity: processingPago ? 0.5 : 1,
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => {
                          if (!processingPago) {
                            e.currentTarget.style.borderColor =
                              "rgba(198,167,94,0.4)";
                            e.currentTarget.style.background =
                              "rgba(198,167,94,0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(255,255,255,0.08)";
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.03)";
                        }}
                      >
                        <span
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "rgba(198,167,94,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#c6a75e",
                            fontSize: 16,
                            flexShrink: 0,
                          }}
                        >
                          {m.id === "mercadopago" ? (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="1"
                                y="4"
                                width="22"
                                height="16"
                                rx="2"
                                ry="2"
                              />
                              <line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                          ) : m.id === "transferencia" ? (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="12" y1="1" x2="12" y2="23" />
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                          ) : (
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                          )}
                        </span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {modalStep === "procesando" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "3px solid rgba(198,167,94,0.2)",
                    borderTop: "3px solid #c6a75e",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 16px",
                  }}
                />
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                  Redirigiendo a MercadoPago...
                </p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {modalStep === "instrucciones" &&
              selectedMetodo &&
              INSTRUCCIONES[selectedMetodo] && (
                <>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#f2f2f2",
                      marginBottom: 4,
                    }}
                  >
                    {INSTRUCCIONES[selectedMetodo].titulo}
                  </h2>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 20,
                    }}
                  >
                    Plan {selectedPlan ? PLANS[selectedPlan]?.name : ""} -{" "}
                    {duration === 90 ? "3 meses" : `${duration} dias`}
                  </p>

                  <div
                    style={{
                      background: "rgba(198,167,94,0.06)",
                      border: "1px solid rgba(198,167,94,0.15)",
                      borderRadius: 10,
                      padding: "16px 18px",
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: "#c6a75e",
                        marginBottom: 8,
                      }}
                    >
                      ${formatPrice(selectedPlanPrice)} UYU
                    </div>
                    <ol
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {INSTRUCCIONES[selectedMetodo].pasos.map((p, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: 13,
                            color: "rgba(255,255,255,0.7)",
                            lineHeight: 1.5,
                          }}
                        >
                          {p}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {pagoError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(255,80,80,0.08)",
                        border: "1px solid rgba(255,80,80,0.2)",
                        color: "#ff6b6b",
                        fontSize: 13,
                        marginBottom: 14,
                      }}
                    >
                      {pagoError}
                    </div>
                  )}

                  {comprobanteUploaded ? (
                    <div
                      style={{
                        padding: "14px 18px",
                        borderRadius: 10,
                        background: "rgba(80,200,120,0.08)",
                        border: "1px solid rgba(80,200,120,0.2)",
                        color: "rgba(80,200,120,0.92)",
                        fontSize: 14,
                        textAlign: "center",
                        marginBottom: 14,
                      }}
                      data-testid="text-comprobante-ok"
                    >
                      Comprobante enviado. Tu pago sera revisado y acreditado
                      por nuestro equipo.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={() => {
                          if (fileInputRef.current?.files?.[0])
                            handleUploadComprobante();
                        }}
                        data-testid="input-comprobante"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingComprobante}
                        data-testid="btn-subir-comprobante"
                        style={{
                          padding: "12px 18px",
                          borderRadius: 10,
                          border: "none",
                          background:
                            "linear-gradient(90deg, #b68a2a, #f3d77d, #b68a2a)",
                          color: "#131313",
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          opacity: uploadingComprobante ? 0.5 : 1,
                        }}
                      >
                        {uploadingComprobante
                          ? "Subiendo..."
                          : "Subir comprobante"}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                    data-testid="btn-cerrar-instrucciones"
                  >
                    Cerrar
                  </button>
                </>
              )}
          </div>
        </div>
      )}
    </main>
  );
}
