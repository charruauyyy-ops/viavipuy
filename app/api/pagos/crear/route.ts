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

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

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
      publicacion_monto 
    } = body ?? {};

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const sc = getServiceClient();
    if (!sc) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });
    }

    // ────────────────────────────────────────────────────────
    // FLUJO PUBLICACIÓN (NUEVO)
    // ────────────────────────────────────────────────────────
    if (tipo === "publicacion") {
      if (!publicacion_id || !publicacion_duracion_dias || !publicacion_monto || !metodo_pago) {
        return NextResponse.json({ error: "Faltan campos para publicacion" }, { status: 400 });
      }

      const validMethods = ["mercadopago", "abitab", "redpagos", "transferencia"];
      if (!validMethods.includes(String(metodo_pago))) {
        return NextResponse.json({ error: "Metodo de pago invalido" }, { status: 400 });
      }

      const { data: existingList } = await sc
        .from("pagos_viavip")
        .select("id, metodo_pago, estado_pago, publicacion_id, plan_duracion_dias, monto, moneda")
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
            plan_duracion_dias: Number(publicacion_duracion_dias), 
            monto: Number(publicacion_monto) 
          })
          .eq("id", existing.id);

        if (updErr) {
          return NextResponse.json({ error: "Error al actualizar pago", details: updErr.message }, { status: 500 });
        }

        return NextResponse.json({
          pago_id: existing.id,
          tipo: "publicacion",
          publicacion_id,
          publicacion_duracion_dias,
          publicacion_monto,
          moneda: "UYU",
          estado_pago: "pendiente",
          metodo_pago,
          reused: true
        });
      }

      const { data: newPago, error: insErr } = await sc
        .from("pagos_viavip")
        .insert({
          user_id: user.id,
          tipo: "publicacion",
          metodo_pago,
          moneda: "UYU",
          estado: "pendiente",
          estado_pago: "pendiente",
          publicacion_id,
          plan_duracion_dias: Number(publicacion_duracion_dias),
          monto: Number(publicacion_monto)
        })
        .select("id")
        .single();

      if (insErr) {
        return NextResponse.json({ error: "Error al crear pago", details: insErr.message }, { status: 500 });
      }

      return NextResponse.json({
        pago_id: newPago.id,
        tipo: "publicacion",
        publicacion_id,
        publicacion_duracion_dias,
        publicacion_monto,
        moneda: "UYU",
        estado_pago: "pendiente",
        metodo_pago,
        reused: false
      });
    }

    // ────────────────────────────────────────────────────────
    // FLUJO PLAN (EXISTENTE)
    // ────────────────────────────────────────────────────────
    if (!plan_id || !duracion_dias || !metodo_pago) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    if (!PLANS?.[plan_id] || plan_id === "free") {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 });
    }

    const validDurations = [7, 30, 90];
    if (!validDurations.includes(Number(duracion_dias))) {
      return NextResponse.json({ error: "Duracion invalida" }, { status: 400 });
    }

    const validMethodsPlan = ["abitab", "redpagos", "transferencia"];
    if (!validMethodsPlan.includes(String(metodo_pago))) {
      return NextResponse.json({ error: "Metodo de pago invalido para planes" }, { status: 400 });
    }

    const monto = getPlanPrice(plan_id, Number(duracion_dias));
    if (!monto) {
      return NextResponse.json({ error: "Precio no encontrado" }, { status: 400 });
    }

    const planNombre = (PLANS as any)?.[plan_id]?.name || (PLANS as any)?.[plan_id]?.titulo || plan_id;

    const { data: existingPlanList } = await sc
      .from("pagos_viavip")
      .select("id, metodo_pago, estado_pago, monto, moneda, plan_nombre, plan_duracion_dias")
      .eq("user_id", user.id)
      .eq("tipo", "plan")
      .in("estado_pago", ["pendiente", "en_espera"])
      .order("created_at", { ascending: false })
      .limit(1);

    const existingPlan = existingPlanList?.[0] ?? null;

    if (existingPlan) {
      const { error: updErr } = await sc
        .from("pagos_viavip")
        .update({
          metodo_pago,
          monto,
          plan_nombre: planNombre,
          plan_duracion_dias: Number(duracion_dias),
        })
        .eq("id", existingPlan.id);

      if (updErr) console.warn("No se pudo actualizar pago:", updErr.message);

      return NextResponse.json({
        pago_id: existingPlan.id,
        monto,
        moneda: "UYU",
        estado_pago: "pendiente",
        metodo_pago,
        plan_nombre: planNombre,
        plan_duracion_dias: Number(duracion_dias),
        reused: true,
      });
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
        publicacion_id: publicacion_id ?? null
      })
      .select("id, monto, moneda, estado_pago, metodo_pago, plan_nombre, plan_duracion_dias")
      .single();

    if (insErr) {
      return NextResponse.json({ error: "Error al crear pago", details: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      pago_id: pago.id,
      monto: pago.monto,
      moneda: pago.moneda,
      estado_pago: pago.estado_pago,
      metodo_pago: pago.metodo_pago,
      plan_nombre: pago.plan_nombre,
      plan_duracion_dias: pago.plan_duracion_dias,
      reused: false,
    });
  } catch (err) {
    console.error("Error en /api/pagos/crear:", err);
    return NextResponse.json({ error: "Error interno", details: (err as any)?.message ?? err }, { status: 500 });
  }
}
