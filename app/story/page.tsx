"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { fixStorageUrl } from "@/lib/fixStorageUrl";

interface CaptionJson {
  line1: string;
  line2: string;
  color1: string;
  color2: string;
}

interface ActiveStory {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  caption_json: CaptionJson | null;
  created_at: string;
  expires_at: string;
}

function getDefaultCaptionJson(): CaptionJson {
  return { line1: "", line2: "", color1: "#ffffff", color2: "#cfcfcf" };
}

function parseCaptionFromStory(story: ActiveStory): CaptionJson {
  if (story.caption_json && typeof story.caption_json === "object") {
    return { ...getDefaultCaptionJson(), ...story.caption_json };
  }
  if (story.caption) {
    try {
      const parsed = JSON.parse(story.caption);
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed.line1 || parsed.text)
      ) {
        return {
          line1: parsed.line1 || parsed.text || "",
          line2: parsed.line2 || "",
          color1: parsed.color1 || "#ffffff",
          color2: parsed.color2 || "#cfcfcf",
        };
      }
    } catch {}
    return {
      line1: story.caption,
      line2: "",
      color1: "#ffffff",
      color2: "#cfcfcf",
    };
  }
  return getDefaultCaptionJson();
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} d`;
}

export default function StoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notDiamante, setNotDiamante] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<ActiveStory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingCaption, setSavingCaption] = useState(false);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [captionJson, setCaptionJson] = useState<CaptionJson>(
    getDefaultCaptionJson(),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) {
        setAuthError("Supabase no configurado.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        setAuthError("Inicia sesion para acceder.");
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_actual")
        .eq("id", user.id)
        .maybeSingle();

      const plan = (profile?.plan_actual || "free").toLowerCase();
      const isEligible = ["diamante", "platino", "plus"].includes(plan);
      if (!isEligible) {
        setNotDiamante(true);
        setLoading(false);
        return;
      }
      setNotDiamante(false);

      const { data: story } = await supabase
        .from("diamante_stories")
        .select(
          "id, media_url, media_type, caption, caption_json, created_at, expires_at",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (story && new Date(story.expires_at) > new Date()) {
        const s = story as ActiveStory;
        setActiveStory(s);
        setCaptionJson(parseCaptionFromStory(s));
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !userId) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      setMsg({ type: "error", text: "Solo se permiten imagenes o videos." });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMsg({ type: "error", text: "El archivo no puede superar 20MB." });
      return;
    }

    setUploading(true);
    setMsg(null);

    const supabase = getSupabase();
    if (!supabase) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `stories/${userId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadErr) {
      setMsg({ type: "error", text: "Error al subir: " + uploadErr.message });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    const media_url = urlData.publicUrl;
    const media_type = isVideo ? "video" : "image";
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { error: dbErr } = await supabase.from("diamante_stories").upsert(
      {
        user_id: userId,
        media_url,
        media_type,
        caption: captionJson.line1 || null,
        caption_json: captionJson,
        created_at: now.toISOString(),
        expires_at: expires.toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (dbErr) {
      setMsg({ type: "error", text: "Error al guardar: " + dbErr.message });
    } else {
      setMsg({ type: "success", text: "Historia subida. Durara 24 horas." });
      setActiveStory({
        id: "",
        media_url,
        media_type,
        caption: captionJson.line1 || null,
        caption_json: captionJson,
        created_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSaveCaption() {
    if (!userId) return;
    setSavingCaption(true);
    setMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setSavingCaption(false);
      return;
    }

    const { error } = await supabase
      .from("diamante_stories")
      .update({ caption: captionJson.line1 || null, caption_json: captionJson })
      .eq("user_id", userId);

    if (error) {
      setMsg({
        type: "error",
        text: "Error al guardar caption: " + error.message,
      });
    } else {
      setMsg({ type: "success", text: "Caption actualizado." });
      if (activeStory) {
        setActiveStory({
          ...activeStory,
          caption: captionJson.line1 || null,
          caption_json: captionJson,
        });
      }
    }
    setSavingCaption(false);
  }

  async function handleDelete() {
    if (!userId) return;
    setDeleting(true);
    setMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setDeleting(false);
      return;
    }

    const { error } = await supabase
      .from("diamante_stories")
      .delete()
      .eq("user_id", userId);

    if (error) {
      setMsg({ type: "error", text: "Error al eliminar: " + error.message });
    } else {
      setMsg({ type: "success", text: "Historia eliminada." });
      setActiveStory(null);
      setCaptionJson(getDefaultCaptionJson());
    }
    setDeleting(false);
  }

  function formatExpiry(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 8,
    color: "#fff",
    padding: "8px 10px",
    fontSize: 14,
    fontFamily: "Inter, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    display: "block",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
  };

  if (loading)
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <p className="vv-form-loading">Cargando...</p>
        </div>
      </main>
    );

  if (authError) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-header">
            <h1 className="vv-form-title">Historia Destacada</h1>
          </div>
          <div className="vv-form-error-box">{authError}</div>
          <a href="/login" className="vv-form-link">
            Ir a Login
          </a>
        </div>
      </main>
    );
  }

  if (notDiamante) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-header">
            <h1 className="vv-form-title">Historia Destacada</h1>
            <p className="vv-form-subtitle">
              Exclusivo para Plus, Platino y Diamante
            </p>
          </div>
          <div className="vv-upsell-card" data-testid="upsell-story">
            <div className="vv-upsell-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3 className="vv-upsell-title">
              Subi tu historia con Plus, Platino o Diamante
            </h3>
            <p className="vv-upsell-text">
              Con los planes Plus, Platino o Diamante podes subir una historia
              destacada que se muestra durante 24 horas en la seccion
              Destacadas, visible para todos los visitantes.
            </p>
            <div className="vv-upsell-features">
              <div className="vv-upsell-feature">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>1 historia cada 24 horas</span>
              </div>
              <div className="vv-upsell-feature">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Imagen o video</span>
              </div>
              <div className="vv-upsell-feature">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Aparece en la seccion Destacadas</span>
              </div>
            </div>
            <a
              href="/planes"
              className="vv-btn"
              style={{ display: "block", textAlign: "center", marginTop: 16 }}
              data-testid="link-planes-story"
            >
              Ver planes
            </a>
          </div>
          <a
            href="/mi-cuenta"
            className="vv-form-back"
            style={{ display: "block", marginTop: 24 }}
          >
            Volver a Mi Cuenta
          </a>
        </div>
      </main>
    );
  }

  const previewTime = activeStory
    ? formatTimeAgo(activeStory.created_at)
    : "Ahora";
  const previewLine2 = captionJson.line2
    ? `${captionJson.line2} · ${previewTime}`
    : previewTime;

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">Historia Destacada</h1>
          <p className="vv-form-subtitle">
            Tu historia se muestra 24h en Destacadas
          </p>
        </div>

        {msg && (
          <div
            className={
              msg.type === "error" ? "vv-form-error-box" : "vv-form-success-box"
            }
            style={{ fontSize: "13px", marginBottom: 14 }}
          >
            {msg.text}
          </div>
        )}

        {activeStory && (
          <div className="vv-cuenta-section" data-testid="active-story-preview">
            <h2 className="vv-cuenta-label">Historia activa</h2>
            <div
              style={{
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 12,
                background: "#111",
                position: "relative",
                aspectRatio: "9/16",
                maxHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeStory.media_type === "video" ? (
                <video
                  src={fixStorageUrl(activeStory.media_url)}
                  controls
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <img
                  src={fixStorageUrl(activeStory.media_url)}
                  alt="Historia activa"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  background: "rgba(0, 0, 0, 0.55)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  borderRadius: 14,
                  padding: "8px 12px",
                  maxWidth: "80%",
                  pointerEvents: "none",
                }}
              >
                {captionJson.line1.trim() && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: captionJson.color1,
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                      marginBottom: 2,
                    }}
                  >
                    {captionJson.line1}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    color: captionJson.color2,
                    lineHeight: 1.3,
                    opacity: 0.9,
                  }}
                >
                  {previewLine2}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-secondary, #777)" }}>
              Vence: {formatExpiry(activeStory.expires_at)}
            </p>
            <button
              type="button"
              className="vv-btn-secondary"
              style={{
                width: "100%",
                marginTop: 10,
                color: "#e74c3c",
                borderColor: "#e74c3c33",
              }}
              disabled={deleting}
              onClick={handleDelete}
              data-testid="button-delete-story"
            >
              {deleting ? "Eliminando..." : "Eliminar historia"}
            </button>
          </div>
        )}

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Caption</h2>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Texto principal (linea 1)</label>
            <input
              type="text"
              value={captionJson.line1}
              onChange={(e) =>
                setCaptionJson({
                  ...captionJson,
                  line1: e.target.value.slice(0, 100),
                })
              }
              placeholder="Ej: Disponible hoy..."
              maxLength={100}
              style={inputStyle}
              data-testid="input-caption-line1"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Texto secundario (linea 2)</label>
            <input
              type="text"
              value={captionJson.line2}
              onChange={(e) =>
                setCaptionJson({
                  ...captionJson,
                  line2: e.target.value.slice(0, 100),
                })
              }
              placeholder="Ej: Zona Centro, Montevideo"
              maxLength={100}
              style={inputStyle}
              data-testid="input-caption-line2"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>Color linea 1</label>
              <select
                value={captionJson.color1}
                onChange={(e) =>
                  setCaptionJson({ ...captionJson, color1: e.target.value })
                }
                style={selectStyle}
                data-testid="select-color1"
              >
                <option value="#ffffff">Blanco</option>
                <option value="#c6a75e">Dorado</option>
                <option value="#ff4444">Rojo</option>
                <option value="#22c55e">Verde</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Color linea 2</label>
              <select
                value={captionJson.color2}
                onChange={(e) =>
                  setCaptionJson({ ...captionJson, color2: e.target.value })
                }
                style={selectStyle}
                data-testid="select-color2"
              >
                <option value="#cfcfcf">Gris claro</option>
                <option value="#ffffff">Blanco</option>
                <option value="#c6a75e">Dorado</option>
                <option value="#22c55e">Verde</option>
              </select>
            </div>
          </div>

          {activeStory && (
            <button
              type="button"
              className="vv-btn"
              style={{
                width: "100%",
                marginBottom: 12,
                background: "#222",
                border: "1px solid #444",
                color: "#fff",
              }}
              disabled={savingCaption}
              onClick={handleSaveCaption}
              data-testid="button-save-caption"
            >
              {savingCaption ? "Guardando..." : "Guardar caption"}
            </button>
          )}
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">
            {activeStory ? "Reemplazar media" : "Subir historia"}
          </h2>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={handleUpload}
            data-testid="input-story-file"
          />

          <button
            type="button"
            className="vv-btn"
            style={{ width: "100%" }}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            data-testid="button-upload-story"
          >
            {uploading
              ? "Subiendo..."
              : activeStory
                ? "Seleccionar y reemplazar"
                : "Seleccionar archivo"}
          </button>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary, #777)",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Imagen o video. Maximo 20MB. Duracion: 24 horas.
          </p>
        </div>

        <a
          href="/mi-cuenta"
          className="vv-form-back"
          style={{ display: "block", marginTop: 24 }}
        >
          Volver a Mi Cuenta
        </a>
      </div>
    </main>
  );
}
