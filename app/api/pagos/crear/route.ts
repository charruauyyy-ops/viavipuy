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

/**
 * AUTH (robusto):
 * - 1) Si viene Authorization: Bearer <token> => valida con Supabase y obtiene user
 * - 2) Si no viene token => intenta por cookies via getRouteSupabase(req,res)
 */
async function getUserFromRequest(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1) Authorization header
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

  // 2) Fallback cookies/session
  const res = NextResponse.json({});
  const supabase = getRouteSupabase(req, res);
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}) as any);
    const { plan_id, duracion_dias, metodo_pago, publicacion_id } = body ?? {};

    // Auth
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validaciones
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

    const validMethods = ["mercadopago", "abitab", "redpagos", "transferencia"];
    if (!validMethods.includes(String(metodo_pago))) {
      return NextResponse.json(
        { error: "Metodo de pago invalido" },
        { status: 400 },
      );
    }

    const monto = getPlanPrice(plan_id, Number(duracion_dias));
    if (!monto) {
      return NextResponse.json(
        { error: "Precio no encontrado" },
        { status: 400 },
      );
    }

    // Service client
    const sc = getServiceClient();
    if (!sc) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
        { status: 500 },
      );
    }

    const planNombre =
      (PLANS as any)?.[plan_id]?.name ||
      (PLANS as any)?.[plan_id]?.titulo ||
      plan_id;

    // ✅ SOLO columnas que existen en public.pagos_viavip
    const insertPayload: any = {
      user_id: user.id,
      tipo: "plan",
      metodo_pago,
      monto,
      moneda: "UYU",
      estado: "pendiente", // Para manuales siempre pendiente
      estado_pago: "pendiente",
      plan_nombre: planNombre,
      plan_duracion_dias: Number(duracion_dias)
    };

    // Agregar publicacion_id solo si viene en el body
    if (publicacion_id) {
      insertPayload.publicacion_id = publicacion_id;
    }

    const { data: pago, error } = await sc
      .from("pagos_viavip")
      .insert(insertPayload)
      .select(
        "id, monto, moneda, estado_pago, metodo_pago, plan_nombre, plan_duracion_dias",
      )
      .single();

    if (error) {
      console.error("Error creating pago:", error);
      // ✅ devuelvo details para que veas el error real (debug)
      return NextResponse.json(
        { error: "Error al crear pago", details: error?.message ?? error },
        { status: 500 },
      );
    }

    return NextResponse.json({
      pago_id: pago.id,
      monto: pago.monto,
      moneda: pago.moneda,
      estado_pago: pago.estado_pago,
      metodo_pago: pago.metodo_pago,
      plan_nombre: pago.plan_nombre,
      plan_duracion_dias: pago.plan_duracion_dias,
    });
  } catch (err) {
    console.error("Error en /api/pagos/crear:", err);
    return NextResponse.json(
      { error: "Error interno", details: (err as any)?.message ?? err },
      { status: 500 },
    );
  }
}
