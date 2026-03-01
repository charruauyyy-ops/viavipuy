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

const PLAN_WEIGHT: Record<string, number> = {
  free: 0,
  plus: 100,
  platino: 200,
  diamante: 300,
};

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
  const computed = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return computed === hash;
}

async function activarPlan(sc: ReturnType<typeof getServiceClient>, pagoId: string, mpPaymentId?: string) {
  if (!sc) return;

  const { data: updated, error } = await sc
    .from("pagos_viavip")
    .update({
      estado_pago: "acreditado",
      acreditado_at: new Date().toISOString(),
      ...(mpPaymentId ? { mp_payment_id: String(mpPaymentId) } : {}),
    })
    .eq("id", pagoId)
    .eq("estado_pago", "pendiente")
    .select("user_id, plan_id, duracion_dias")
    .single();

  if (error || !updated) return;

  const now = new Date();
  const expiresAt = addDays(now, updated.duracion_dias);
  const planWeight = PLAN_WEIGHT[updated.plan_id] ?? 0;

  await sc
    .from("profiles")
    .update({
      plan_actual: updated.plan_id,
      plan_estado: "activo",
      plan_expires_at: expiresAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", updated.user_id);

  await sc
    .from("publicaciones")
    .update({
      plan_weight: planWeight,
      plan_actual: updated.plan_id,
      updated_at: now.toISOString(),
    })
    .eq("user_id", updated.user_id);
}

export async function POST(req: NextRequest) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json({ error: "MP no configurado" }, { status: 500 });
    }

    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: true });
    }

    if (!verifyWebhookSignature(req, rawBody)) {
      console.error("Webhook: firma invalida");
      return NextResponse.json({ error: "Firma invalida" }, { status: 401 });
    }

    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentApi = new Payment(client);
    const payment = await paymentApi.get({ id: body.data.id });

    if (!payment || payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const pagoId = payment.external_reference;
    if (!pagoId) {
      return NextResponse.json({ ok: true });
    }

    const sc = getServiceClient();
    await activarPlan(sc, pagoId, String(body.data.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
