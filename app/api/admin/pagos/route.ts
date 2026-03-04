import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, logAudit } from "@/lib/adminService";

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

export async function GET(req: NextRequest) {
  const res = NextResponse.json({});
  const admin = await getAuthenticatedAdmin(req, res);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { serviceClient: sc } = admin;
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || "pendiente";

  const { data: pagos, error } = await sc
    .from("pagos_viavip")
    .select("*")
    .eq("estado_pago", estado)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((pagos || []).map((p: any) => p.user_id))];
  let profilesMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await sc
      .from("profiles")
      .select("id, email, nombre")
      .in("id", userIds);
    if (profiles) {
      for (const p of profiles) {
        profilesMap[p.id] = p;
      }
    }
  }

  const enriched = (pagos || []).map((p: any) => ({
    ...p,
    usuario_email: profilesMap[p.user_id]?.email || "",
    usuario_nombre: profilesMap[p.user_id]?.nombre || "",
  }));

  return NextResponse.json({ pagos: enriched });
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({});
  const admin = await getAuthenticatedAdmin(req, res);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { adminId, serviceClient: sc } = admin;
  const body = await req.json();
  const { pago_id, accion } = body;

  if (!pago_id || !["acreditar", "rechazar"].includes(accion)) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const { data: pago } = await sc
    .from("pagos_viavip")
    .select("*")
    .eq("id", pago_id)
    .single();

  if (!pago) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (pago.estado_pago !== "pendiente") {
    return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 400 });
  }

  const isManual = ["abitab", "redpagos", "transferencia"].includes(pago.metodo_pago);

  if (accion === "acreditar" && isManual && !pago.comprobante_url) {
    return NextResponse.json({ error: "No se puede aprobar un pago manual sin comprobante" }, { status: 400 });
  }

  if (accion === "rechazar") {
    const { error: updErr } = await sc
      .from("pagos_viavip")
      .update({
        estado_pago: "rechazado",
        acreditado_at: new Date().toISOString(),
      })
      .eq("id", pago_id)
      .eq("estado_pago", "pendiente");

    if (updErr) {
      return NextResponse.json({ error: "Error al rechazar" }, { status: 500 });
    }

    await logAudit(sc, adminId, "pago_rechazado", "pagos_viavip", pago_id, {
      plan_id: pago.plan_id,
      monto: pago.monto,
    });

    return NextResponse.json({ ok: true });
  }

  const { data: updated, error: updErr } = await sc
    .from("pagos_viavip")
    .update({
      estado_pago: "acreditado",
      acreditado_at: new Date().toISOString(),
    })
    .eq("id", pago_id)
    .eq("estado_pago", "pendiente")
    .select("user_id, plan_id, duracion_dias")
    .single();

  if (updErr || !updated) {
    return NextResponse.json({ error: "Error al acreditar o pago ya procesado" }, { status: 500 });
  }

  const planWeight = PLAN_WEIGHT[updated.plan_id] ?? 0;

  // Actualizar el plan usando la función RPC para manejar correctamente la acumulación de días
  await sc.rpc("admin_apply_plan", {
    p_user_id: updated.user_id,
    p_plan_id: updated.plan_id,
    p_days: updated.duracion_dias,
  });

  await sc
    .from("publicaciones")
    .update({
      plan_weight: planWeight,
      plan_actual: updated.plan_id,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", updated.user_id);

  await logAudit(sc, adminId, "pago_acreditado", "pagos_viavip", pago_id, {
    plan_id: updated.plan_id,
    monto: pago.monto,
    duracion_dias: updated.duracion_dias,
  });

  return NextResponse.json({ ok: true });
}
