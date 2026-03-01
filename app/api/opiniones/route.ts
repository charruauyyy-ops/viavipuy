import { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicClient } from "@/lib/supabasePublic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { publicacion_id, comentario, rating, nombre, anonimo } = body;

    if (!publicacion_id || typeof publicacion_id !== "string") {
      return NextResponse.json(
        { error: "publicacion_id es obligatorio." },
        { status: 400 },
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: "rating debe ser un entero entre 1 y 5." },
        { status: 400 },
      );
    }

    const trimmed = typeof comentario === "string" ? comentario.trim() : "";
    if (!trimmed || trimmed.length < 5) {
      return NextResponse.json(
        { error: "comentario es obligatorio (minimo 5 caracteres)." },
        { status: 400 },
      );
    }

    let autor: string;
    if (anonimo === true) {
      autor = "Anonimo";
    } else if (nombre?.trim()) {
      autor = nombre.trim();
    } else {
      autor = "Invitado";
    }

    const supabase = getSupabasePublicClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Error de configuracion." },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("opiniones")
      .insert({
        publicacion_id,
        comentario: trimmed,
        rating,
        autor,
        status: "approved",
        respuesta: null,
        respondida_at: null,
      })
      .select("id, publicacion_id, rating, autor, status, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, opinion: data }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
