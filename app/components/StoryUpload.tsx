"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export interface CaptionData {
  text: string;
  style: "pill" | "none" | "highlight";
  color: "white" | "gold" | "red" | "green";
  size: "sm" | "md" | "lg";
  weight: 400 | 600 | 700;
  position: "bottom" | "middle" | "top";
  align: "left" | "center";
}

export function getDefaultCaption(text?: string): CaptionData {
  return {
    text: text || "",
    style: "pill",
    color: "white",
    size: "md",
    weight: 600,
    position: "bottom",
    align: "center",
  };
}

export function parseCaption(raw?: string | null): CaptionData {
  if (!raw) return getDefaultCaption();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.text === "string") {
      return { ...getDefaultCaption(), ...parsed };
    }
  } catch {}
  return getDefaultCaption(raw);
}

interface StoryUploadProps {
  userId: string;
}

export default function StoryUpload({ userId }: StoryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasActive, setHasActive] = useState<boolean | null>(null);
  const [activeExpires, setActiveExpires] = useState<string | null>(null);
  const [caption, setCaption] = useState<CaptionData>(getDefaultCaption());
  const [savingCaption, setSavingCaption] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function check() {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("diamante_stories")
        .select("id, expires_at, caption")
        .eq("user_id", userId)
        .maybeSingle();
      if (data && new Date(data.expires_at) > new Date()) {
        setHasActive(true);
        setActiveExpires(data.expires_at);
        if (data.caption) {
          setCaption(parseCaption(data.caption));
        }
      } else {
        setHasActive(false);
      }
    }
    check();
  }, [userId]);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

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
    if (!supabase) { setUploading(false); return; }

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

    const captionJson = JSON.stringify(caption);

    const { error: dbErr } = await supabase
      .from("diamante_stories")
      .upsert(
        {
          user_id: userId,
          media_url,
          media_type,
          caption: captionJson,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (dbErr) {
      setMsg({ type: "error", text: "Error al guardar: " + dbErr.message });
    } else {
      setMsg({ type: "success", text: "Historia subida. Durara 24 horas." });
      setHasActive(true);
      setActiveExpires(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSaveCaption() {
    setSavingCaption(true);
    setMsg(null);
    const supabase = getSupabase();
    if (!supabase) { setSavingCaption(false); return; }

    const captionJson = JSON.stringify(caption);
    const { error } = await supabase
      .from("diamante_stories")
      .update({ caption: captionJson })
      .eq("user_id", userId);

    if (error) {
      setMsg({ type: "error", text: "Error al guardar caption: " + error.message });
    } else {
      setMsg({ type: "success", text: "Caption actualizado." });
    }
    setSavingCaption(false);
  }

  function formatExpiry(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  }

  const selectStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 6,
    color: "#fff",
    padding: "6px 8px",
    fontSize: 13,
    flex: 1,
    minWidth: 0,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div className="vv-cuenta-section">
      <h2 className="vv-cuenta-label">Historia Destacada</h2>
      <p style={{ fontSize: "13px", color: "var(--text-secondary, #999999)", marginBottom: 10 }}>
        Como Diamante podes subir una historia que se muestra 24h en la seccion Destacadas.
      </p>

      {hasActive && activeExpires && (
        <div className="vv-form-success-box" style={{ fontSize: "13px", marginBottom: 10 }}>
          Tenes una historia activa. Vence: {formatExpiry(activeExpires)}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Texto del caption</label>
        <textarea
          value={caption.text}
          onChange={(e) => setCaption({ ...caption, text: e.target.value.slice(0, 200) })}
          placeholder="Escribe tu caption..."
          maxLength={200}
          rows={2}
          style={{
            width: "100%",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 8,
            color: "#fff",
            padding: "8px 10px",
            fontSize: 14,
            resize: "none",
            fontFamily: "Inter, sans-serif",
          }}
          data-testid="input-story-caption"
        />
        <div style={{ fontSize: 11, color: "#666", textAlign: "right", marginTop: 2 }}>
          {caption.text.length}/200
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Estilo</label>
          <select
            value={caption.style}
            onChange={(e) => setCaption({ ...caption, style: e.target.value as CaptionData["style"] })}
            style={selectStyle}
            data-testid="select-caption-style"
          >
            <option value="pill">Pill</option>
            <option value="highlight">Highlight</option>
            <option value="none">Sin fondo</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Color</label>
          <select
            value={caption.color}
            onChange={(e) => setCaption({ ...caption, color: e.target.value as CaptionData["color"] })}
            style={selectStyle}
            data-testid="select-caption-color"
          >
            <option value="white">Blanco</option>
            <option value="gold">Dorado</option>
            <option value="red">Rojo</option>
            <option value="green">Verde</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tamano</label>
          <select
            value={caption.size}
            onChange={(e) => setCaption({ ...caption, size: e.target.value as CaptionData["size"] })}
            style={selectStyle}
            data-testid="select-caption-size"
          >
            <option value="sm">Chico</option>
            <option value="md">Mediano</option>
            <option value="lg">Grande</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Posicion</label>
          <select
            value={caption.position}
            onChange={(e) => setCaption({ ...caption, position: e.target.value as CaptionData["position"] })}
            style={selectStyle}
            data-testid="select-caption-position"
          >
            <option value="bottom">Abajo</option>
            <option value="middle">Centro</option>
            <option value="top">Arriba</option>
          </select>
        </div>
      </div>

      {hasActive && (
        <button
          className="vv-btn"
          style={{ width: "100%", fontSize: "13px", marginBottom: 8, background: "#222", border: "1px solid #444" }}
          disabled={savingCaption}
          onClick={handleSaveCaption}
          data-testid="button-save-caption"
        >
          {savingCaption ? "Guardando..." : "Guardar caption"}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={handleUpload}
        data-testid="input-story-file"
      />

      {msg && (
        <div className={msg.type === "error" ? "vv-form-error-box" : "vv-form-success-box"} style={{ fontSize: "13px", marginBottom: 10 }}>
          {msg.text}
        </div>
      )}

      <button
        className="vv-btn"
        style={{ width: "100%", fontSize: "13px" }}
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        data-testid="button-upload-story"
      >
        {uploading ? "Subiendo..." : hasActive ? "Reemplazar historia" : "Subir historia"}
      </button>
    </div>
  );
}
