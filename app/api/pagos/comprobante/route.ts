import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabaseRoute";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({});
    const supabase = getRouteSupabase(req, res);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await req.formData();
    const pagoId = formData.get("pago_id") as string;
    const file = formData.get("comprobante") as File;

    if (!pagoId || !file) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const sc = getServiceClient();
    if (!sc) {
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }

    const { data: pago } = await sc
      .from("pagos_viavip")
      .select("id, user_id, estado_pago")
      .eq("id", pagoId)
      .eq("user_id", user.id)
      .single();

    if (!pago) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    if (pago.estado_pago !== "pendiente") {
      return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `comprobantes/${user.id}/${pagoId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await sc.storage
      .from("verificaciones")
      .upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
    }

    const { data: publicUrl } = sc.storage
      .from("verificaciones")
      .getPublicUrl(path);

    await sc
      .from("pagos_viavip")
      .update({ comprobante_url: publicUrl.publicUrl })
      .eq("id", pagoId);

    return NextResponse.json({ ok: true, url: publicUrl.publicUrl });
  } catch (err) {
    console.error("Error en /api/pagos/comprobante:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
