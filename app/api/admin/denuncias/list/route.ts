import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // 🔴 IMPORTANTE
    );

    const { data, error } = await supabase
      .from("denuncias")
      .select(
        "id, publicacion_id, motivo, zona, telefono_reportado, fecha_accion, created_at",
      )
      .eq("verificado", true)
      .order("fecha_accion", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "Error listando denuncias", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ denuncias: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "Fallo interno" }, { status: 500 });
  }
}
