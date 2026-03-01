import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type Payload = {
  motivo: string;
  link_perfil: string;
  detalles?: string;
  contacto?: string;
};

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function ipHash(req: Request) {
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

function userAgent(req: Request) {
  return req.headers.get("user-agent") || null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.formData()) as FormData;

    const payload: Payload = {
      motivo: String(body.get("motivo") || "").trim(),
      link_perfil: String(body.get("link_perfil") || "").trim(),
      detalles: String(body.get("detalles") || "").trim() || undefined,
      contacto: String(body.get("contacto") || "").trim() || undefined,
    };

    if (!payload.motivo || !payload.link_perfil) {
      return NextResponse.json({ ok: false, error: "Faltan campos obligatorios." }, { status: 400 });
    }

    const prioridad = payload.motivo === "menor_edad" ? "urgente" : "normal";

    const supabase = getClient();

    const insertRow: Record<string, any> = {
      motivo: payload.motivo,
      link_perfil: payload.link_perfil,
      detalles: payload.detalles ?? null,
      contacto: payload.contacto ?? null,
      prioridad,
      user_agent: userAgent(req),
      ip_hash: ipHash(req),
    };

    const { error } = await supabase.from("reportes").insert(insertRow);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.redirect(new URL("/reportar?ok=1", req.url));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error inesperado." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed" }, { status: 405 });
}
