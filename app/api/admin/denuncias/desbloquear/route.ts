import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, logAudit } from "@/lib/adminService";

export async function POST(req: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { serviceClient, adminId } = admin;

  const body = await req.json();
  const { publicacion_id } = body;

  if (!publicacion_id) {
    return NextResponse.json({ error: "publicacion_id es obligatorio" }, { status: 400 });
  }

  const { error: updateErr } = await serviceClient
    .from("publicaciones")
    .update({ estado: "activo" })
    .eq("id", publicacion_id);

  if (updateErr) {
    return NextResponse.json({ error: "Error actualizando publicación", detail: updateErr.message }, { status: 500 });
  }

  await serviceClient
    .from("denuncias")
    .delete()
    .eq("publicacion_id", publicacion_id);

  await logAudit(serviceClient, adminId, "desbloquear_publicacion", "denuncias", publicacion_id);

  return NextResponse.json({ ok: true });
}
