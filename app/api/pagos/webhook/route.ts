import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const PLAN_WEIGHT: Record<string, number> = { free: 0, plus: 100, platino: 200, diamante: 300 };

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function verifyWebhookSignature(req: NextRequest, body: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key && value) parts[key] = value;
  }
  const ts = parts["ts"];
  const hash = parts["v1"];
  if (!ts || !hash) return false;
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return computed === hash;
}

async function activarPlan(sc: any, pagoId: string, mpPaymentId?: string) {
  if (!sc) return;
  const { data: updated, error } = await sc.from("pagos_viavip").update({ estado_pago: "acreditado", acreditado_at: new Date().toISOString(), ...(mpPaymentId ? { mp_payment_id: String(mpPaymentId) } : {}) }).eq("id", pagoId).eq("estado_pago", "pendiente").select("user_id, plan_id, duracion_dias").single();
  if (error || !updated) return;
  const now = new Date();
  const expiresAt = addDays(now, updated.duracion_dias);
  const planWeight = PLAN_WEIGHT[updated.plan_id] ?? 0;
  await sc.from("profiles").update({ plan_actual: updated.plan_id, plan_estado: "activo", plan_expires_at: expiresAt.toISOString(), updated_at: now.toISOString() }).eq("id", updated.user_id);
  await sc.from("publicaciones").update({ plan_weight: planWeight, plan_actual: updated.plan_id, updated_at: now.toISOString() }).eq("user_id", updated.user_id);
}

async function activarPublicacion(sc: any, pagoId: string, mpPaymentId?: string) {
  if (!sc) return;
  const { data: pago, error: fetchErr } = await sc.from("pagos_viavip").select("id, tipo, user_id, publicacion_id, publicacion_duracion_dias, estado_pago").eq("id", pagoId).single();
  if (fetchErr || !pago) return;
  if (pago.tipo !== "publicacion" || !pago.publicacion_id) return;
  if (pago.estado_pago === "acreditado") return;
  const duracion = Number(pago.publicacion_duracion_dias);
  if (![30, 60, 90].includes(duracion)) return;
  await sc.from("pagos_viavip").update({ estado_pago: "acreditado", estado: "aprobado", validado_at: new Date().toISOString(), ...(mpPaymentId ? { mp_payment_id: String(mpPaymentId) } : {}) }).eq("id", pagoId);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + duracion);
  await sc.from("publicaciones").update({ expires_at: expiresAt.toISOString(), grace_until: null, estado_publicacion: "activo", updated_at: new Date().toISOString() }).eq("id", pago.publicacion_id);
}

export async function POST(req: NextRequest) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) return NextResponse.json({ error: "MP no configurado" }, { status: 500 });
    const rawBody = await req.text();
    let body: any;
    try { body = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: true }); }
    if (!verifyWebhookSignature(req, rawBody)) return NextResponse.json({ error: "Firma invalida" }, { status: 401 });
    if (body.type !== "payment" || !body.data?.id) return NextResponse.json({ ok: true });
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentApi = new Payment(client);
    const payment = await paymentApi.get({ id: body.data.id });
    if (!payment || payment.status !== "approved") return NextResponse.json({ ok: true });
    const pagoId = payment.external_reference;
    if (!pagoId) return NextResponse.json({ ok: true });
    const sc = getServiceClient();
    if (!sc) return NextResponse.json({ ok: true });
    const { data: pagoBase } = await sc.from("pagos_viavip").select("tipo").eq("id", pagoId).single();
    if (!pagoBase) return NextResponse.json({ ok: true });
    if (pagoBase.tipo === "plan") await activarPlan(sc, pagoId, String(body.data.id));
    else if (pagoBase.tipo === "publicacion") await activarPublicacion(sc, pagoId, String(body.data.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
