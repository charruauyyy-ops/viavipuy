"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
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
      "Indica que queres hacer un pago a Jonathan Semelman",
      "Cedula 37884659",
      "Guarda el comprobante y subilo aca",
    ],
  },
  redpagos: {
    titulo: "Pago en RedPagos",
    pasos: [
      "Acercate a cualquier local RedPagos",
        "Indica que queres hacer un pago a Jonathan Semelman",
        "Cedula 37884659",
      "Guarda el comprobante y subilo aca",
    ],
  },
  transferencia: {
    titulo: "Transferencia bancaria",
    pasos: [
      "Realiza una transferencia a la cuenta Prex:",
      "Cuenta: 21657689",
      "Nombre: Jonathan Semelman",
      "Concepto: tu email de registro",
      "Subi el comprobante de la transferencia aca",
    ],
  },
};

function PlanesContent() {
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

  async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers || {});
    const supabase = getSupabase();
    const sessionRes = supabase ? await supabase.auth.getSession() : null;
    const token = sessionRes?.data?.session?.access_token?.trim();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const isFormData = init.body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(input, { ...init, headers, credentials: "include" });
  }

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setLoading(false); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      setSessionToken(sessionData?.session?.access_token || null);
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) { setUserId(null); setLoading(false); return; }
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("plan_actual, plan_estado").eq("id", user.id).maybeSingle();
      if (profile) { setCurrentPlan(profile.plan_actual || "free"); setPlanEstado(profile.plan_estado || "sin_plan"); }
      setLoading(false);
    }
    load();
  }, []);

  async function fetchCatalogo() {
    try {
      const res = await fetch("/api/planes/catalogo", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setCatalogo(data);
    } catch (err) { console.error("Error fetching catalogo:", err); }
  }

  useEffect(() => { fetchCatalogo(); }, []);

  function getPrecio(plan: string, dias: number) {
    const item = catalogo.find((p: any) => p.plan.toLowerCase() === plan.toLowerCase() && p.duracion_dias === dias);
    return item ? item.precio_uyu : 0;
  }

  function handleActivate(planId: string) {
    setSelectedPlan(planId); setSelectedMetodo(null); setModalStep("metodo"); setPagoId(null); setPagoError(null); setComprobanteUploaded(false); setShowModal(true);
  }

  async function handleSelectMetodo(metodo: MetodoPago) {
    if (!selectedPlan || !userId) return;
    setSelectedMetodo(metodo); setProcessingPago(true); setPagoError(null);
    if (metodo === "mercadopago") {
      setModalStep("procesando");
      try {
        const res = await authFetch("/api/pagos/mercadopago", { method: "POST", body: JSON.stringify({ plan_id: selectedPlan, duracion_dias: duration }) });
        const data = await res.json();
        if (data.init_point) { window.location.href = data.init_point; return; }
        setPagoError(data.error || "Error al procesar pago"); setModalStep("metodo");
      } catch { setPagoError("Error de conexion"); setModalStep("metodo"); }
      setProcessingPago(false); return;
    }
    try {
      const res = await authFetch("/api/pagos/crear", { method: "POST", body: JSON.stringify({ plan_id: selectedPlan, duracion_dias: duration, metodo_pago: metodo }) });
      const data = await res.json();
      if (data.pago_id) { setPagoId(data.pago_id); setModalStep("instrucciones"); } else setPagoError(data.error || "Error al crear pago");
    } catch { setPagoError("Error de conexion"); }
    setProcessingPago(false);
  }

  async function handleUploadComprobante() {
    if (!fileInputRef.current?.files?.[0] || !pagoId) return;
    setUploadingComprobante(true); setPagoError(null);
    try {
      const formData = new FormData();
      formData.append("pago_id", pagoId);
      formData.append("comprobante", fileInputRef.current.files[0]);
      const res = await authFetch("/api/pagos/comprobante", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) setComprobanteUploaded(true); else setPagoError(data.error || "Error al subir comprobante");
    } catch { setPagoError("Error de conexion"); }
    setUploadingComprobante(false);
  }

  const durationTabs = useMemo(() => [{ key: 7 as const, label: "7 dias" }, { key: 30 as const, label: "30 dias" }, { key: 90 as const, label: "3 meses" }] as const, []);
  const selectedPlanPrice = selectedPlan ? getPrecio(selectedPlan, duration) : 0;
  function formatPrice(n: number) { return n >= 1000 ? `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, "0")}` : String(n); }

  return (
    <main className="vv-form-page">
      <div className="vv-planes-container">
        <div className="vv-form-header" style={{ textAlign: "center" }}>
          <h1 className="vv-form-title">Planes</h1>
          <p className="vv-form-subtitle">Elegi tu duracion y activa el plan que te da mas exposicion.</p>
          <div className={styles.durationTabs}>
            {durationTabs.map((t) => (
              <button key={t.key} onClick={() => setDuration(t.key)} className={`${styles.durationTab} ${duration === t.key ? styles.durationTabActive : ""}`} data-testid={`btn-duration-${t.key}`}>{t.label}</button>
            ))}
          </div>
        </div>
        {!loading && !userId && (
          <div style={{ maxWidth: 600, margin: "0 auto 20px", padding: "14px 18px", borderRadius: 10, fontSize: 14, textAlign: "center", background: "rgba(198,167,94,0.06)", border: "1px solid rgba(198,167,94,0.18)", color: "rgba(255,255,255,0.7)" }} data-testid="text-login-cta">
            <a href="/login?returnTo=/planes" style={{ color: "#c6a75e", fontWeight: 700, textDecoration: "underline" }} data-testid="link-login-planes">Inicia sesion</a> para activar un plan.
          </div>
        )}
        {flashMsg && (
          <div style={{ maxWidth: 600, margin: "0 auto 20px", padding: "14px 18px", borderRadius: 10, fontSize: 14, textAlign: "center", background: flashMsg.type === "success" ? "rgba(80,200,120,0.08)" : "rgba(255,80,80,0.08)", border: `1px solid ${flashMsg.type === "success" ? "rgba(80,200,120,0.2)" : "rgba(255,80,80,0.2)"}`, color: flashMsg.type === "success" ? "rgba(80,200,120,0.92)" : "rgba(255,80,80,0.92)" }} data-testid="text-flash-msg">{flashMsg.text}</div>
        )}
        <div className={styles.grid}>
          {PLAN_ORDER.filter((p) => p !== "free").map((planId) => {
            const isCurrent = currentPlan === planId && planEstado === "activo";
            return (
              <div key={planId} className={`${styles.card} ${planId === "diamante" ? styles.featured : ""}`}>
                <div className={styles.planHeader}>
                  {planId === "diamante" && <div className={styles.bestValue}>Más elegido</div>}
                  <div className={`${styles.badge} ${styles[`badge_${planId}`]}`}>{planId.toUpperCase()}</div>
                  <h3 className={styles.planTitle}>
                    {planId === "plus" && "PLUS — Más visibilidad"}
                    {planId === "platino" && "PLATINO — Exposición superior"}
                    {planId === "diamante" && "DIAMANTE — Máxima visibilidad"}
                  </h3>
                </div>
                <div className={styles.priceList}>
                  {[7, 30, 90].map((d) => (
                    <div key={d} className={`${styles.priceItem} ${duration === d ? styles.priceItemActive : ""}`}>
                      <span className={styles.priceDays}>{d === 90 ? "3 meses" : `${d} días`}</span>
                      <span className={styles.priceValue}>${formatPrice(getPrecio(planId, d))} UYU</span>
                    </div>
                  ))}
                </div>
                <ul className={styles.features}>
                  {planId === "plus" && (
                    <>
                      <li>✔ Hasta 25 fotos en tu perfil</li><li>✔ Historias destacadas visibles</li><li>✔ Aparece en búsquedas de clientes</li><li>✔ Aparece en carrusel de destacadas</li><li>✔ Panel de métricas</li><li>✔ Badge PLUS</li><li>✔ Prioridad leve</li>
                    </>
                  )}
                  {planId === "platino" && (
                    <>
                      <li>✔ Hasta 25 fotos en tu perfil</li><li>✔ Historias destacadas visibles</li><li>✔ Aparece en búsquedas de clientes</li><li>✔ Aparece en carrusel de destacadas</li><li>✔ Panel completo de métricas</li><li>✔ Badge PLATINO premium</li><li>✔ Boost en ranking</li><li>✔ Prioridad media</li>
                    </>
                  )}
                  {planId === "diamante" && (
                    <>
                      <li>✔ Hasta 25 fotos en tu perfil</li><li>✔ Historias destacadas prioritarias</li><li>✔ Aparece en búsquedas de clientes</li><li>✔ Aparece en carrusel de destacadas</li><li>✔ Panel avanzado de métricas</li><li>✔ Badge DIAMANTE premium</li><li>✔ Máxima prioridad</li><li>✔ Prioridad máxima</li>
                      <li className={styles.extraFeature}>✔ Datos avanzados desbloqueados</li><li className={styles.extraSub}>- tendencias</li><li className={styles.extraSub}>- actividad en tiempo real</li><li className={styles.extraSub}>- favoritos</li><li className={styles.extraSub}>- métricas completas</li>
                    </>
                  )}
                </ul>
                <p className={styles.planFooterText}>
                  {planId === "plus" && "Más visibilidad = más visitas a tu perfil."}
                  {planId === "platino" && "Mayor exposición = más tráfico."}
                  {planId === "diamante" && "La mayor exposición posible."}
                </p>
                {isCurrent ? <div className={styles.currentPlan}>Plan actual</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: 'auto' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c6a75e', textAlign: 'center', marginBottom: '5px' }}>${formatPrice(getPrecio(planId, duration))} / {duration === 90 ? "3 meses" : `${duration} días`}</div>
                    <button className="vv-btn vv-plan-btn" disabled={loading || !userId} onClick={() => handleActivate(planId)} data-testid={`btn-activar-${planId}`}>
                      {!userId ? "Inicia sesion" : currentPlan === planId && planEstado === "vencido" ? "Renovar" : "Activar plan"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }} onClick={() => { if (!processingPago) setShowModal(false); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#141414", border: "1px solid rgba(198,167,94,0.25)", borderRadius: 16, maxWidth: 440, width: "100%", padding: "28px 24px", position: "relative", maxHeight: "90vh", overflowY: "auto" }}>
            <button onClick={() => setShowModal(false)} disabled={processingPago} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }} data-testid="btn-close-modal">x</button>
            {modalStep === "metodo" && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f2f2f2", marginBottom: 4 }}>Formas de pago</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>Plan {selectedPlan ? PLANS[selectedPlan]?.name : ""} - {duration === 90 ? "3 meses" : `${duration} dias`} - ${formatPrice(selectedPlanPrice)} UYU</p>
                {pagoError && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", fontSize: 13, marginBottom: 16 }}>{pagoError}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {METODOS.map((m) => (
                    <button key={m.id} onClick={() => handleSelectMetodo(m.id)} disabled={processingPago} data-testid={`btn-metodo-${m.id}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#f2f2f2", cursor: "pointer", fontSize: 15, fontWeight: 600, fontFamily: "inherit", opacity: processingPago ? 0.5 : 1, textAlign: "left" }}>
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(198,167,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#c6a75e", fontSize: 16, flexShrink: 0 }}>
                        {m.id === "mercadopago" ? "MP" : m.id === "abitab" ? "A" : m.id === "redpagos" ? "R" : "T"}
                      </span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {modalStep === "instrucciones" && selectedMetodo && (
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f2f2f2", marginBottom: 16 }}>{INSTRUCCIONES[selectedMetodo]?.titulo}</h2>
                <div style={{ textAlign: "left", background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                  {INSTRUCCIONES[selectedMetodo]?.pasos.map((p, i) => ( <div key={i} style={{ display: "flex", gap: 12, fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}><span style={{ color: "#c6a75e", fontWeight: 700 }}>{i + 1}.</span>{p}</div> ))}
                </div>
                {!comprobanteUploaded ? (
                  <>
                    <input type="file" ref={fileInputRef} onChange={handleUploadComprobante} style={{ display: "none" }} accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingComprobante} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "linear-gradient(90deg, #b68a2a, #f3d77d, #b68a2a)", color: "#131313", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: uploadingComprobante ? 0.5 : 1 }}>{uploadingComprobante ? "Subiendo..." : "Subir comprobante"}</button>
                  </>
                ) : (
                  <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>Comprobante enviado. Se activará tras revisión.</div>
                )}
                <button onClick={() => setShowModal(false)} style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function PlanesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "36px", height: "36px", border: "3px solid rgba(198,167,94,0.2)", borderTop: "3px solid #c6a75e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>}>
      <PlanesContent />
    </Suspense>
  );
}
