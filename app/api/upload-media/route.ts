import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { watermarkImage, isWatermarkable } from "@/lib/watermarkImage";

function getBearerToken(req: NextRequest): string | null {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  // 1) Prefer Authorization: Bearer <access_token> (soluciona el 401 por cookies en Replit)
  const token = getBearerToken(req);
  if (token) {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data.user?.id || null;
  }

  // 2) Fallback a cookies (si existe sesión por SSR cookies)
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    console.error(`[upload-media] Missing env vars: ${missing.join(", ")}`);
    return NextResponse.json(
      { error: `Configuracion del servidor incompleta. Faltan: ${missing.join(", ")}. Agregalas en Secrets de Replit.` },
      { status: 500 },
    );
  }

  const authUserId = await getAuthUserId(req);
  if (!authUserId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const type = formData.get("type") as string | null;

    if (!file || !userId || !type) {
      return NextResponse.json(
        { error: "Missing file, userId, or type" },
        { status: 400 },
      );
    }

    if (userId !== authUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 25MB)" },
        { status: 400 },
      );
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (type === "foto" && !isImage) {
      return NextResponse.json(
        { error: "Solo se permiten imagenes" },
        { status: 400 },
      );
    }
    if (type === "video" && !isVideo) {
      return NextResponse.json(
        { error: "Solo se permiten videos" },
        { status: 400 },
      );
    }

    if (type === "foto" && !isWatermarkable(file.type)) {
      return NextResponse.json(
        { error: "Formato no soportado. Solo jpg, png o webp." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    let uploadBuffer: Buffer;
    let ext: string;
    let contentType: string;

    if (isImage) {
      const result = await watermarkImage(Buffer.from(arrayBuffer), file.type);
      uploadBuffer = result.buffer;
      ext = result.ext;
      contentType = result.contentType;
    } else {
      uploadBuffer = Buffer.from(arrayBuffer);
      ext = file.name.split(".").pop() || "mp4";
      contentType = file.type;
    }

    const folder = type === "foto" ? "fotos" : "videos";
    const path = `media/${userId}/${folder}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, uploadBuffer, {
        cacheControl: "3600",
        upsert: false,
        contentType,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    console.error("upload-media error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 },
    );
  }
}
