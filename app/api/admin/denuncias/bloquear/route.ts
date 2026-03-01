// app/api/admin/denuncias/bloquear/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, logAudit } from "@/lib/adminService";

export async function POST(req: NextRequest) {
  // importante: crear res y pasarlo para cookies/session en route handler
  const res = NextResponse.next();

  const admin = await getAuthenticatedAdmin(req, res);
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { serviceClient, adminId } = admin;

  const body = await req.json();
  const { motivo, zona, telefono_reportado, verificado = true } = body;
  let { publicacion_id, telefono } = body;

  if (!motivo || typeof motivo !== "string" || motivo.trim().length === 0) {
    return NextResponse.json(
      { error: "Motivo es obligatorio" },
      { status: 400 },
    );
  }

  if (!publicacion_id && !telefono) {
    return NextResponse.json(
      { error: "Debe indicar publicacion_id o telefono" },
      { status: 400 },
    );
  }

  if (!publicacion_id && telefono) {
    const cleaned = String(telefono).trim();

    const { data: matches, error: searchErr } = await serviceClient
      .from("publicaciones")
      .select("id, nombre, telefono")
      .ilike("telefono", `%${cleaned}%`);

    if (searchErr) {
      return NextResponse.json(
        { error: "Error buscando por teléfono" },
        { status: 500 },
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: "No se encontró publicación con ese teléfono" },
        { status: 404 },
      );
    }

    if (matches.length > 1) {
      return NextResponse.json(
        {
          error: "Ambigüedad: múltiples publicaciones con ese teléfono",
          matches: matches.map((m: { id: string; nombre: string }) => ({
            id: m.id,
            nombre: m.nombre,
          })),
        },
        { status: 409 },
      );
    }

    publicacion_id = matches[0].id;
  }

  const { error: updateErr } = await serviceClient
    .from("publicaciones")
    .update({ estado: "bloqueado" })
    .eq("id", publicacion_id);

  if (updateErr) {
    return NextResponse.json(
      {
        error: "Error actualizando estado de publicación",
        detail: updateErr.message,
      },
      { status: 500 },
    );
  }

  const { data: existing } = await serviceClient
    .from("denuncias")
    .select("id")
    .eq("publicacion_id", publicacion_id)
    .maybeSingle();

  const denunciaData = {
    publicacion_id,
    motivo: motivo.trim(),
    zona: zona?.trim?.() || null,
    telefono_reportado: telefono_reportado?.trim?.() || null,
    verificado: !!verificado,
    fecha_accion: new Date().toISOString().split("T")[0],
  };

  if (existing?.id) {
    await serviceClient
      .from("denuncias")
      .update(denunciaData)
      .eq("id", existing.id);
  } else {
    await serviceClient.from("denuncias").insert(denunciaData);
  }

  await logAudit(
    serviceClient,
    adminId,
    "bloquear_publicacion",
    "denuncias",
    publicacion_id,
    {
      motivo: motivo.trim(),
    },
  );

  return NextResponse.json({ ok: true, publicacion_id });
}
