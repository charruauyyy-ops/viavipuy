import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function isAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : 
                 authHeader?.startsWith("bearer ") ? authHeader.slice(7).trim() : null;
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;

  const supa = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} }
  });

  const { data: { user }, error: userErr } = await supa.auth.getUser();
  if (userErr || !user) return false;

  const { data: profile } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return !!profile?.is_admin;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sc = getServiceClient();
  if (!sc) return NextResponse.json({ error: "Error de configuración" }, { status: 500 });

  const { data: publicaciones } = await sc
    .from("publicacion_precios")
    .select("*")
    .order("duracion_dias", { ascending: true });

  const { data: planes } = await sc
    .from("planes_catalogo")
    .select("*")
    .order("plan", { ascending: true })
    .order("duracion_dias", { ascending: true });

  return NextResponse.json({ publicaciones, planes });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const sc = getServiceClient();
  if (!sc) return NextResponse.json({ error: "Error de configuración" }, { status: 500 });

  // Soporte para updates individuales (retrocompatibilidad)
  if (body.id) {
    const { tipo, id, precio_uyu, activo } = body;
    if (tipo === "publicacion") {
      const { error } = await sc
        .from("publicacion_precios")
        .update({ precio_uyu: Number(precio_uyu) })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (tipo === "plan") {
      const { error } = await sc
        .from("planes_catalogo")
        .update({ precio_uyu: Number(precio_uyu), activo: Boolean(activo) })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } 
  // Soporte para updates masivos (nuevo requerimiento)
  else {
    const { publicaciones, planes } = body;
    if (publicaciones && Array.isArray(publicaciones)) {
      for (const p of publicaciones) {
        await sc.from("publicacion_precios").update({ precio_uyu: Number(p.precio_uyu) }).eq("id", p.id);
      }
    }
    if (planes && Array.isArray(planes)) {
      for (const p of planes) {
        await sc.from("planes_catalogo").update({ precio_uyu: Number(p.precio_uyu), activo: Boolean(p.activo) }).eq("id", p.id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
