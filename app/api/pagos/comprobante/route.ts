import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteSupabase } from "@/lib/supabaseRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeJson(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

function parseBearer(req: NextRequest): string | null {
  const h =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

type UploadFileLike = File | Blob;

function isFileLike(v: any): v is UploadFileLike {
  return !!v && typeof v === "object" && typeof v.arrayBuffer === "function";
}

function getFileName(v: any): string | null {
  return typeof v?.name === "string" ? v.name : null;
}

function getFileType(v: any): string | null {
  return typeof v?.type === "string" ? v.type : null;
}

async function tryParseForm(req: NextRequest) {
  try {
    const form = await req.formData();
    const pagoVal = form.get("pago_id");
    const fileVal = form.get("comprobante");

    const pagoId = typeof pagoVal === "string" ? pagoVal : null;
    const file = isFileLike(fileVal) ? (fileVal as UploadFileLike) : null;

    return {
      ok: true as const,
      kind: "multipart" as const,
      pagoId,
      file,
      keys: Array.from(form.keys()),
      rawComprobanteType: fileVal
        ? Object.prototype.toString.call(fileVal)
        : null,
    };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || String(e) };
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1) Auth: cookies/session then Bearer fallback
    const res = NextResponse.json({});
    const supabase = getRouteSupabase(req, res);

    let userId: string | null = null;

    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
    } catch {
      userId = null;
    }

    if (!userId) {
      const token = parseBearer(req);
      if (token) {
        const anon = getAnonClient();
        if (anon) {
          const { data } = await anon.auth.getUser(token);
          userId = data?.user?.id ?? null;
        }
      }
    }

    if (!userId) return safeJson(401, { error: "No autenticado" });

    // 2) Parse body robustly:
    // Some clients set wrong Content-Type. So:
    // - Try formData() first (works only for real multipart/urlencoded)
    // - If it throws, fallback to JSON.
    const ct = (req.headers.get("content-type") || "").toLowerCase();

    let pagoId: string | null = null;
    let file: UploadFileLike | null = null;

    let base64: string | null = null;
    let filename: string | null = null;
    let mime: string | null = null;

    const formAttempt = await tryParseForm(req);

    if (formAttempt.ok) {
      pagoId = formAttempt.pagoId;
      file = formAttempt.file;

      if (!pagoId || !file) {
        return safeJson(400, {
          error: "Faltan campos",
          details:
            "Se requiere pago_id y comprobante (File/Blob en multipart).",
          content_type_seen: ct || null,
          received_keys: formAttempt.keys,
          has_pago_id: !!pagoId,
          has_comprobante: !!file,
          received_comprobante_type: formAttempt.rawComprobanteType,
        });
      }
    } else {
      // Not multipart/urlencoded => try JSON
      const body = await req.json().catch(() => null);

      pagoId = body?.pago_id ?? null;
      base64 = body?.comprobante_base64 ?? null;
      filename = body?.filename ?? null;
      mime = body?.mime ?? null;

      if (!pagoId || !base64) {
        return safeJson(400, {
          error: "Faltan campos",
          details: "Se requiere pago_id y comprobante_base64 (en JSON).",
          content_type_seen: ct || null,
          formdata_error: formAttempt.error,
          received_keys: body ? Object.keys(body) : null,
        });
      }
    }

    // 3) Service client for DB + Storage (bypass RLS)
    const sc = getServiceClient();
    if (!sc) {
      return safeJson(500, {
        error: "Error interno",
        details: "Faltan env vars de Supabase.",
      });
    }

    // 4) Validate payment ownership + status
    const { data: pago, error: pagoErr } = await sc
      .from("pagos_viavip")
      .select("id, user_id, estado_pago")
      .eq("id", pagoId!)
      .single();

    if (pagoErr)
      return safeJson(500, { error: "DB error", details: pagoErr.message });
    if (!pago || pago.user_id !== userId)
      return safeJson(404, { error: "Pago no encontrado" });
    if (pago.estado_pago !== "pendiente")
      return safeJson(400, { error: "Este pago ya fue procesado" });

    // 5) Build bytes
    let bytes: Uint8Array;
    let ext = "bin";
    let contentType = "application/octet-stream";
    let originalName: string | null = null;

    if (file) {
      contentType = getFileType(file) || "application/octet-stream";
      originalName = getFileName(file) || "comprobante";
      const inferred = originalName.includes(".")
        ? originalName.split(".").pop()!.toLowerCase()
        : null;
      ext =
        inferred ||
        (contentType.includes("png")
          ? "png"
          : contentType.includes("jpeg") || contentType.includes("jpg")
            ? "jpg"
            : contentType.includes("pdf")
              ? "pdf"
              : "bin");
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const raw = base64!.includes(",") ? base64!.split(",").pop()! : base64!;
      bytes = Uint8Array.from(Buffer.from(raw, "base64"));
      contentType = mime || "application/octet-stream";
      if (filename && filename.includes("."))
        ext = filename.split(".").pop()!.toLowerCase();
      originalName = filename || "comprobante";
    }

    // 6) Upload to Storage
    const bucket = "comprobantes-pagos";
    const storagePath = `comprobantes/${userId}/${pagoId}.${ext}`;

    const { error: upErr } = await sc.storage
      .from(bucket)
      .upload(storagePath, bytes, {
        contentType,
        upsert: true,
      });

    if (upErr) {
      return safeJson(500, {
        error: "Error al subir archivo",
        details: upErr.message,
        bucket,
      });
    }

    // 7) Save reference in DB (bucket is private => store reference)
    const ref = `${bucket}:${storagePath}`;

    const { error: updErr } = await sc
      .from("pagos_viavip")
      .update({
        comprobante_url: ref,
        comprobante_uploaded_at: new Date().toISOString(),
      })
      .eq("id", pagoId!);

    if (updErr) {
      return safeJson(500, {
        error: "Error al actualizar pago",
        details: updErr.message,
      });
    }

    return safeJson(200, {
      ok: true,
      pago_id: pagoId,
      comprobante_ref: ref,
      filename: originalName,
      mime: contentType,
      bytes: bytes.length,
    });
  } catch (err: any) {
    console.error("Error en /api/pagos/comprobante:", err);
    return safeJson(500, {
      error: "Error interno",
      details: err?.message || String(err),
    });
  }
}
