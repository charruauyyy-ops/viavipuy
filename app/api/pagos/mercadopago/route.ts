// app/api/pagos/mercadopago/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabaseRoute";
import { getPlanPrice, PLANS } from "@/lib/plans";
import { MercadoPagoConfig, Preference } from "mercadopago";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUserFromRequest(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  // 1) Authorization header
  if (bearer && url && anon) {
    const supa = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data, error } = await supa.auth.getUser();
    if (!error && data?.user) return data.user;
  }

  // 2) Cookies/session fallback
  const res = NextResponse.json({});
  const supabase = getRouteSupabase(req, res);
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

type PendingPagoRow = {
  id: string;
  metodo_pago: string;
  estado_pago: string;
  plan_nombre: string | null;
  plan_duracion_dias: number | null;
  publicacion_id: string | null;
  mp_preference_id: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json(
        { error: "MercadoPago no configurado" },
        { status: 500 },
      );
    }

    // Auth
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}) as any);
    const plan_id = String(body?.plan_id ?? "");
    const duracion_dias = Number(body?.duracion_dias);
    const publicacion_id: string | null = body?.publicacion_id ?? null;

    if (!plan_id || !duracion_dias) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }
    if (!PLANS?.[plan_id] || plan_id === "free") {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 });
    }
    const validDurations = [7, 30, 90];
    if (!validDurations.includes(duracion_dias)) {
      return NextResponse.json({ error: "Duracion invalida" }, { status: 400 });
    }

    const monto = getPlanPrice(plan_id, duracion_dias);
    if (!monto) {
      return NextResponse.json(
        { error: "Precio no encontrado" },
        { status: 400 },
      );
    }

    const sc = getServiceClient();
    if (!sc) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
        { status: 500 },
      );
    }

    const planName: string =
      (PLANS as any)?.[plan_id]?.name ||
      (PLANS as any)?.[plan_id]?.titulo ||
      plan_id;

    // =========================
    // IDEMPOTENCIA (modo A)
    // - Reusar pago pendiente existente si es mercadopago
    // - Si existe pendiente de otro método, devolvemos 409
    // =========================
    const { data: anyPending, error: anyPendingErr } = await sc
      .from("pagos_viavip")
      .select(
        "id, metodo_pago, estado_pago, plan_nombre, plan_duracion_dias, publicacion_id, mp_preference_id",
      )
      .eq("user_id", user.id)
      .eq("tipo", "plan")
      .eq("plan_nombre", planName)
      .eq("plan_duracion_dias", duracion_dias)
      .is("publicacion_id", publicacion_id)
      .in("estado_pago", ["pendiente", "en_espera"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (anyPendingErr) {
      console.error("DB select pending error:", anyPendingErr);
      return NextResponse.json(
        { error: "Error interno", details: anyPendingErr.message },
        { status: 500 },
      );
    }

    const pending: PendingPagoRow | null =
      (anyPending?.[0] as PendingPagoRow | undefined) ?? null;

    if (pending && pending.metodo_pago !== "mercadopago") {
      return NextResponse.json(
        {
          error: "Ya existe un pago pendiente",
          existing: {
            pago_id: pending.id,
            metodo_pago: pending.metodo_pago,
            estado_pago: pending.estado_pago,
          },
        },
        { status: 409 },
      );
    }

    // Reusar si existe, crear si no existe (pagoId SIEMPRE string)
    let reused = false;
    let pagoId: string;

    if (pending?.id) {
      pagoId = pending.id;
      reused = true;
    } else {
      const insertPayload = {
        user_id: user.id,
        tipo: "plan",
        metodo_pago: "mercadopago",
        monto,
        moneda: "UYU",
        estado: "pendiente",
        estado_pago: "pendiente",
        plan_nombre: planName,
        plan_duracion_dias: duracion_dias,
        publicacion_id,
      };

      const { data: pago, error: insertErr } = await sc
        .from("pagos_viavip")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr || !pago?.id) {
        console.error("DB insert pago error:", insertErr);
        return NextResponse.json(
          {
            error: "Error al crear pago",
            details: insertErr?.message ?? insertErr,
          },
          { status: 500 },
        );
      }

      pagoId = pago.id as string;
    }

    // MP preference (regenerable sin reinsertar pago)
    const host = req.headers.get("host");
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);

    const durationLabel =
      duracion_dias === 90 ? "3 meses" : `${duracion_dias} dias`;

    const prefResp: any = await preference.create({
      body: {
        items: [
          {
            id: pagoId,
            title: `VIAVIP Plan ${planName} - ${durationLabel}`,
            quantity: 1,
            unit_price: Number(monto),
            currency_id: "UYU",
          },
        ],
        external_reference: pagoId,
        back_urls: {
          success: `${siteUrl}/planes?pago=ok&id=${pagoId}`,
          failure: `${siteUrl}/planes?pago=error`,
          pending: `${siteUrl}/planes?pago=pendiente&id=${pagoId}`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/pagos/webhook`,
      },
    });

    const prefId: string | null = prefResp?.body?.id ?? prefResp?.id ?? null;
    const initPoint: string | null =
      prefResp?.body?.init_point ?? prefResp?.init_point ?? null;

    if (!initPoint) {
      console.error("MP preference response (sin init_point):", prefResp);
      return NextResponse.json(
        { error: "Error al crear preferencia MP" },
        { status: 500 },
      );
    }

    if (prefId) {
      const upd = await sc
        .from("pagos_viavip")
        .update({ mp_preference_id: prefId })
        .eq("id", pagoId);

      if (upd.error) {
        // No frenamos el checkout por esto
        console.warn("No se pudo guardar mp_preference_id:", upd.error.message);
      }
    }

    return NextResponse.json({
      pago_id: pagoId,
      init_point: initPoint,
      reused,
    });
  } catch (err: any) {
    console.error("Error en /api/pagos/mercadopago:", err);
    return NextResponse.json(
      { error: "Error interno", details: err?.message ?? err },
      { status: 500 },
    );
  }
}
