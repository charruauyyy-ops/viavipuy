import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabaseRoute";
import { getPlanPrice, PLANS } from "@/lib/plans";
import { MercadoPagoConfig, Preference } from "mercadopago";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 500 });
    }

    const res = NextResponse.json({});
    const supabase = getRouteSupabase(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { plan_id, duracion_dias } = body;

    if (!plan_id || !duracion_dias) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    if (!PLANS[plan_id] || plan_id === "free") {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 });
    }

    const validDurations = [7, 30, 90];
    if (!validDurations.includes(duracion_dias)) {
      return NextResponse.json({ error: "Duracion invalida" }, { status: 400 });
    }

    const monto = getPlanPrice(plan_id, duracion_dias);
    if (!monto) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 400 });
    }

    const sc = getServiceClient();
    if (!sc) {
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    const { data: pago, error: insertErr } = await sc
      .from("pagos_viavip")
      .insert({
        user_id: user.id,
        plan_id,
        duracion_dias,
        monto,
        metodo_pago: "mercadopago",
        estado: "aprobado",
        estado_pago: "pendiente",
      })
      .select("id")
      .single();

    if (insertErr || !pago) {
      console.error("Error creating pago:", insertErr);
      return NextResponse.json({ error: "Error al crear pago" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.get("host")}`;

    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);

    const planName = PLANS[plan_id].name;
    const durationLabel = duracion_dias === 90 ? "3 meses" : `${duracion_dias} dias`;

    const prefData = await preference.create({
      body: {
        items: [
          {
            id: pago.id,
            title: `VIAVIP Plan ${planName} - ${durationLabel}`,
            quantity: 1,
            unit_price: monto,
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

    if (!prefData.init_point) {
      return NextResponse.json({ error: "Error al crear preferencia MP" }, { status: 500 });
    }

    await sc
      .from("pagos_viavip")
      .update({ mp_preference_id: prefData.id })
      .eq("id", pago.id);

    return NextResponse.json({
      pago_id: pago.id,
      init_point: prefData.init_point,
    });
  } catch (err) {
    console.error("Error en /api/pagos/mercadopago:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
