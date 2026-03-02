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

export async function POST(req: NextRequest) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json(
        { error: "MercadoPago no configurado" },
        { status: 500 },
      );
    }

    // Auth (robusto: Header + Cookies)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let user = null;
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (bearer && url && anon) {
      const supa = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data, error } = await supa.auth.getUser();
      if (!error && data?.user) user = data.user;
    }

    if (!user) {
      const res = NextResponse.json({});
      const supabase = getRouteSupabase(req, res);
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    }

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan_id = String(body?.plan_id ?? "");
    const duracion_dias = Number(body?.duracion_dias);

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

    const planName =
      (PLANS as any)?.[plan_id]?.name ||
      (PLANS as any)?.[plan_id]?.titulo ||
      plan_id;

    // ✅ Insert SOLO con columnas reales de pagos_viavip
    const insertPayload: any = {
      user_id: user.id,
      tipo: "plan",
      metodo_pago: "mercadopago",
      monto,
      moneda: "UYU",
      estado: "pendiente",
      estado_pago: "pendiente",
      plan_nombre: planName,
      plan_duracion_dias: duracion_dias
    };

    if (body?.publicacion_id) {
      insertPayload.publicacion_id = body.publicacion_id;
    }

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

    const host = req.headers.get("host");
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);

    const durationLabel =
      duracion_dias === 90 ? "3 meses" : `${duracion_dias} dias`;

    // ✅ SDK: siempre mandar { body: {...} }
    const prefResp: any = await preference.create({
      body: {
        items: [
          {
            id: pago.id,
            title: `VIAVIP Plan ${planName} - ${durationLabel}`,
            quantity: 1,
            unit_price: Number(monto),
            currency_id: "UYU",
          },
        ],
        external_reference: pago.id,
        back_urls: {
          success: `${siteUrl}/planes?pago=ok&id=${pago.id}`,
          failure: `${siteUrl}/planes?pago=error`,
          pending: `${siteUrl}/planes?pago=pendiente&id=${pago.id}`,
        },
        auto_return: "approved",
        notification_url: `${siteUrl}/api/pagos/webhook`,
      },
    });

    const prefId = prefResp?.body?.id ?? prefResp?.id ?? null;
    const initPoint =
      prefResp?.body?.init_point ?? prefResp?.init_point ?? null;

    if (!initPoint) {
      console.error("MP preference response (sin init_point):", prefResp);
      return NextResponse.json(
        { error: "Error al crear preferencia MP" },
        { status: 500 },
      );
    }

    // ✅ Guardar mp_preference_id SOLO si existe (si no existe, no rompemos)
    if (prefId) {
      const upd = await sc
        .from("pagos_viavip")
        .update({ mp_preference_id: prefId })
        .eq("id", pago.id);

      if (upd.error) {
        // No frenamos el checkout por esto
        console.warn(
          "No se pudo guardar mp_preference_id:",
          upd.error?.message,
        );
      }
    }

    return NextResponse.json({
      pago_id: pago.id,
      init_point: initPoint,
    });
  } catch (err: any) {
    console.error("Error en /api/pagos/mercadopago:", err);
    return NextResponse.json(
      { error: "Error interno", details: err?.message ?? err },
      { status: 500 },
    );
  }
}
