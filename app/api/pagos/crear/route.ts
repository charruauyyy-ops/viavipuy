// app/api/pagos/crear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabaseRoute";
import { getPlanPrice, PLANS } from "@/lib/plans";

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
    const body = await req.json().catch(() => ({}) as any);
    const {
      tipo,
      plan_id,
      duracion_dias,
      metodo_pago,
      publicacion_id,
      publicacion_duracion_dias,
      publicacion_monto,
    } = body ?? {};

    const user = await getUserFromRequest(req);
    if (!user)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const sc = getServiceClient();
    if (!sc)
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
        { status: 500 },
      );

    if (tipo === "publicacion") {
      if (
        !publicacion_id ||
        !publicacion_duracion_dias ||
        !publicacion_monto ||
        !metodo_pago
      ) {
        return NextResponse.json(
          { error: "Faltan campos para publicacion" },
          { status: 400 },
        );
      }

      const { data: existingList } = await sc
        .from("pagos_viavip")
        .select(
          "id, metodo_pago, estado_pago, publicacion_id, publicacion_duracion_dias, publicacion_monto, moneda",
        )
        .eq("user_id", user.id)
        .eq("tipo", "publicacion")
        .eq("publicacion_id", publicacion_id)
        .in("estado_pago", ["pendiente", "en_espera"])
        .order("created_at", { ascending: false })
        .limit(1);

      const existing = existingList?.[0] ?? null;

      if (existing) {
        const { error: updErr } = await sc
          .from("pagos_viavip")
          .update({
            metodo_pago,
            publicacion_duracion_dias: Number(publicacion_duracion_dias),
            publicacion_monto: Number(publicacion_monto),
            // ✅ FIX: la tabla requiere monto NOT NULL
            monto: Number(publicacion_monto),
            estado: "pendiente",
            estado_pago: "pendiente",
          })
          .eq("id", existing.id);

        if (updErr)
          return NextResponse.json(
            { error: "Error al actualizar pago", details: updErr.message },
            { status: 500 },
          );
        return NextResponse.json({ pago_id: existing.id, reused: true });
      }

      const { data: newPago, error: insErr } = await sc
        .from("pagos_viavip")
        .insert({
          user_id: user.id,
          tipo: "publicacion",
          metodo_pago,
          // ✅ FIX: la tabla requiere monto NOT NULL
          monto: Number(publicacion_monto),
          moneda: "UYU",
          estado: "pendiente",
          estado_pago: "pendiente",
          publicacion_id,
          publicacion_duracion_dias: Number(publicacion_duracion_dias),
          publicacion_monto: Number(publicacion_monto),
        })
        .select("id")
        .single();

      if (insErr)
        return NextResponse.json(
          { error: "Error al crear pago", details: insErr.message },
          { status: 500 },
        );
      return NextResponse.json({ pago_id: newPago.id, reused: false });
    }

    // Flujo de PLAN
    if (!plan_id || !duracion_dias || !metodo_pago)
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

    const monto = getPlanPrice(plan_id, Number(duracion_dias));
    const planNombre =
      (PLANS as any)?.[plan_id]?.name ||
      (PLANS as any)?.[plan_id]?.titulo ||
      plan_id;

    const { data: existingPlanList } = await sc
      .from("pagos_viavip")
      .select("id")
      .eq("user_id", user.id)
      .eq("tipo", "plan")
      .in("estado_pago", ["pendiente", "en_espera"])
      .order("created_at", { ascending: false })
      .limit(1);

    const existingPlan = existingPlanList?.[0] ?? null;

    if (existingPlan) {
      await sc
        .from("pagos_viavip")
        .update({
          metodo_pago,
          monto,
          plan_nombre: planNombre,
          plan_duracion_dias: Number(duracion_dias),
          estado: "pendiente",
          estado_pago: "pendiente",
        })
        .eq("id", existingPlan.id);
      return NextResponse.json({ pago_id: existingPlan.id, reused: true });
    }

    const { data: pago, error: insErr } = await sc
      .from("pagos_viavip")
      .insert({
        user_id: user.id,
        tipo: "plan",
        metodo_pago,
        monto,
        moneda: "UYU",
        estado: "pendiente",
        estado_pago: "pendiente",
        plan_nombre: planNombre,
        plan_duracion_dias: Number(duracion_dias),
      })
      .select("id")
      .single();

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    return NextResponse.json({ pago_id: pago.id, reused: false });
  } catch (err) {
    console.error("Error en /api/pagos/crear:", err);
    return NextResponse.json(
      { error: "Error interno", details: (err as any)?.message },
      { status: 500 },
    );
  }
}
