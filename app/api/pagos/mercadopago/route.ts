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
  if (bearer && url && anon) {
    const supa = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data, error } = await supa.auth.getUser();
    if (!error && data?.user) return data.user;
  }
  const res = NextResponse.json({});
  const supabase = getRouteSupabase(req, res);
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken)
      return NextResponse.json(
        { error: "MercadoPago no configurado" },
        { status: 500 },
      );
    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await req.json().catch(() => ({}) as any);
    const tipo = body?.tipo || "plan";
    const publicacion_id = body?.publicacion_id || null;

    let monto: number;
    let title: string;
    let duracion_dias: number;
    let planNombre: string | null = null;

    if (tipo === "publicacion") {
      duracion_dias = Number(body?.publicacion_duracion_dias);
      monto = Number(body?.publicacion_monto);
      if (!publicacion_id || !duracion_dias || !monto)
        return NextResponse.json(
          { error: "Faltan campos para publicacion" },
          { status: 400 },
        );
      title = `Publicación VIAVIP - ${duracion_dias} días`;
    } else {
      const plan_id = String(body?.plan_id ?? "");
      duracion_dias = Number(body?.duracion_dias || body?.plan_duracion_dias);
      if (!plan_id || !duracion_dias)
        return NextResponse.json(
          { error: "Faltan campos para plan" },
          { status: 400 },
        );
      const planMonto = getPlanPrice(plan_id, duracion_dias);
      if (!planMonto)
        return NextResponse.json(
          { error: "Precio no encontrado" },
          { status: 400 },
        );
      monto = planMonto;
      planNombre =
        (PLANS as any)?.[plan_id]?.name ||
        (PLANS as any)?.[plan_id]?.titulo ||
        plan_id;
      title = `VIAVIP Plan ${planNombre} - ${duracion_dias} dias`;
    }

    const sc = getServiceClient();
    if (!sc)
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
        { status: 500 },
      );

    const query = sc
      .from("pagos_viavip")
      .select("id, mp_preference_id")
      .eq("user_id", user.id)
      .eq("tipo", tipo)
      .in("estado_pago", ["pendiente", "en_espera"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (tipo === "publicacion") query.eq("publicacion_id", publicacion_id);
    else query.is("publicacion_id", null);

    const { data: anyPending } = await query;
    const pending = anyPending?.[0] || null;

    let pagoId: string;
    let reused = false;

    if (pending?.id) {
      pagoId = pending.id;
      reused = true;
      const updateData: any = {
        metodo_pago: "mercadopago",
        moneda: "UYU",
        estado: "pendiente",
        estado_pago: "pendiente",
      };
      if (tipo === "publicacion") {
        updateData.publicacion_duracion_dias = duracion_dias;
        updateData.publicacion_monto = monto;
        // ✅ FIX: la tabla requiere monto NOT NULL
        updateData.monto = monto;
      } else {
        updateData.plan_nombre = planNombre;
        updateData.plan_duracion_dias = duracion_dias;
        updateData.monto = monto;
      }
      await sc.from("pagos_viavip").update(updateData).eq("id", pagoId);
    } else {
      const insertPayload: any = {
        user_id: user.id,
        tipo,
        metodo_pago: "mercadopago",
        moneda: "UYU",
        estado: "pendiente",
        estado_pago: "pendiente",
        publicacion_id,
      };
      if (tipo === "publicacion") {
        insertPayload.publicacion_duracion_dias = duracion_dias;
        insertPayload.publicacion_monto = monto;
        // ✅ FIX: la tabla requiere monto NOT NULL
        insertPayload.monto = monto;
      } else {
        insertPayload.plan_nombre = planNombre;
        insertPayload.plan_duracion_dias = duracion_dias;
        insertPayload.monto = monto;
      }
      const { data: pago, error: insertErr } = await sc
        .from("pagos_viavip")
        .insert(insertPayload)
        .select("id")
        .single();
      if (insertErr || !pago?.id)
        return NextResponse.json(
          { error: "Error al crear pago", details: insertErr?.message },
          { status: 500 },
        );
      pagoId = pago.id;
    }

    const host = req.headers.get("host");
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "");
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const preference = new Preference(client);
    const prefResp: any = await preference.create({
      body: {
        items: [
          {
            id: pagoId,
            title: title,
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

    const prefId = prefResp?.id || prefResp?.body?.id;
    if (prefId)
      await sc
        .from("pagos_viavip")
        .update({ mp_preference_id: prefId })
        .eq("id", pagoId);

    return NextResponse.json({
      pago_id: pagoId,
      init_point: prefResp?.init_point || prefResp?.body?.init_point,
      reused,
    });
  } catch (err: any) {
    console.error("Error en /api/pagos/mercadopago:", err);
    return NextResponse.json(
      { error: "Error interno", details: err?.message },
      { status: 500 },
    );
  }
}
