"use client";

import { useState, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { fixStorageUrl } from "@/lib/fixStorageUrl";

const MAX_UPLOAD_BATCH = 10;
const MAX_PHOTOS_TOTAL = 30;

function getUploadLimits(_plan?: string) {
  return { maxBatch: MAX_UPLOAD_BATCH, maxTotal: MAX_PHOTOS_TOTAL };
}

interface MediaGalleryProps {
  userId: string;
  fotos: string[];
  videos: string[];
  maxFotos: number | null;
  maxVideos: number;
  planName: string;
  onFotosChange: (urls: string[]) => void;
  onVideosChange: (urls: string[]) => void;
  onCoverChange: (url: string) => void;
  coverUrl: string;
  videoPreviewUrl?: string;
  onVideoPreviewChange?: (url: string) => void;
}

export default function MediaGallery({
  userId,
  fotos,
  videos,
  maxFotos,
  maxVideos,
  planName,
  onFotosChange,
  onVideosChange,
  onCoverChange,
  coverUrl,
  videoPreviewUrl,
  onVideoPreviewChange,
}: MediaGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const limits = getUploadLimits(planName);
  const fotosCount = fotos.length;
  const videosCount = videos.length;

  const planFotoLimit = 25;
  const canAddFoto = fotosCount < planFotoLimit;
  const canAddVideo = videosCount < 15;

  const fotosLabel = `${fotosCount}/25`;
  const videosLabel = `${videosCount}/15`;

  async function uploadSinglePhoto(file: File, accessToken: string): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("type", "foto");

    const res = await fetch("/api/upload-media", {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : { error: await res.text() };

    if (!res.ok) {
      throw new Error(payload?.error || "Error desconocido");
    }

    return payload.url;
  }

  async function handleMultiUpload(files: FileList) {
    setUploadMsg(null);
    setUploadErr(null);
    setUploadProgress("");

    const fileArr = Array.from(files);

    if (fileArr.length > limits.maxBatch) {
      setUploadErr(`Maximo ${limits.maxBatch} fotos por vez.`);
      return;
    }

    const remaining = 25 - fotosCount;
    if (remaining <= 0) {
      setUploadErr(`Limite de fotos alcanzado (25 fotos).`);
      return;
    }

    const toUpload = fileArr.slice(0, remaining);
    const skipped = fileArr.length - toUpload.length;

    for (const f of toUpload) {
      if (f.size > 25 * 1024 * 1024) {
        setUploadErr("Cada foto no puede superar 25MB.");
        return;
      }
      if (!f.type.startsWith("image/")) {
        setUploadErr("Solo se permiten imagenes.");
        return;
      }
    }

    if (skipped > 0) {
      setUploadMsg(`Se subiran ${toUpload.length} fotos. Limite total: 25.`);
    }

    setUploading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setUploadErr("Supabase no inicializado.");
        setUploading(false);
        return;
      }

      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || "";

      if (sessionErr || !accessToken) {
        setUploadErr("Sesion no valida. Cerra sesion y volve a entrar.");
        setUploading(false);
        return;
      }

      const newUrls: string[] = [];
      let errorCount = 0;

      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress(`Subiendo ${i + 1}/${toUpload.length}...`);
        try {
          const url = await uploadSinglePhoto(toUpload[i], accessToken);
          if (url) newUrls.push(url);
        } catch {
          errorCount++;
        }
      }

      if (newUrls.length > 0) {
        const updatedFotos = [...fotos, ...newUrls];
        onFotosChange(updatedFotos);

        if (!coverUrl && updatedFotos.length > 0) {
          onCoverChange(updatedFotos[0]);
        }
      }

      setUploadProgress("");

      if (errorCount > 0 && newUrls.length > 0) {
        setUploadMsg(`${newUrls.length} fotos subidas. ${errorCount} fallaron.`);
      } else if (errorCount > 0) {
        setUploadErr(`Error al subir las fotos.`);
      } else {
        setUploadMsg(
          newUrls.length === 1
            ? "Foto subida correctamente."
            : `${newUrls.length} fotos subidas correctamente.`
        );
      }
    } catch (err: any) {
      setUploadErr("Error al subir: " + (err?.message || "Error desconocido"));
      setUploadProgress("");
    }

    setUploading(false);
  }

  async function uploadVideo(file: File) {
    setUploadMsg(null);
    setUploadErr(null);

    if (file.size > 25 * 1024 * 1024) {
      setUploadErr("El archivo no puede superar 25MB.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setUploadErr("Solo se permiten videos.");
      return;
    }

    if (!canAddVideo) {
      setUploadErr(
        `Limite de videos alcanzado (15 videos).`,
      );
      return;
    }

    setUploading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setUploadErr("Supabase no inicializado.");
        setUploading(false);
        return;
      }

      const ext = file.name.split(".").pop() || "mp4";
      const path = `media/${userId}/videos/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        setUploadErr("Error al subir: " + error.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("media")
        .getPublicUrl(path);
      onVideosChange([...videos, urlData.publicUrl]);
      setUploadMsg("Video subido correctamente.");
    } catch (err: any) {
      setUploadErr("Error al subir: " + (err?.message || "Error desconocido"));
    }

    setUploading(false);
  }

  function removeFoto(index: number) {
    const url = fotos[index];
    const newFotos = fotos.filter((_, i) => i !== index);
    onFotosChange(newFotos);

    if (coverUrl === url) {
      onCoverChange(newFotos[0] || "");
    }
  }

  function removeVideo(index: number) {
    const url = videos[index];
    onVideosChange(videos.filter((_, i) => i !== index));
    if (videoPreviewUrl === url && onVideoPreviewChange) {
      onVideoPreviewChange("");
    }
  }

  function setVideoPreview(url: string) {
    if (onVideoPreviewChange) {
      onVideoPreviewChange(videoPreviewUrl === url ? "" : url);
    }
  }

  function setCover(url: string) {
    onCoverChange(url);
  }

  return (
    <div className="vv-media-gallery" data-testid="media-gallery">
      <div className="vv-media-header">
        <h3 className="vv-media-title">Galeria de medios</h3>
        <div className="vv-media-counts">
          <span className="vv-media-count">Fotos: {fotosLabel}</span>
          <span className="vv-media-count">Videos: {videosLabel}</span>
        </div>
      </div>

      {uploadErr && (
        <div
          className="vv-form-error-box"
          style={{ fontSize: "13px", marginBottom: 10 }}
        >
          {uploadErr}
        </div>
      )}
      {uploadMsg && (
        <div
          className="vv-form-success-box"
          style={{ fontSize: "13px", marginBottom: 10 }}
        >
          {uploadMsg}
        </div>
      )}
      {uploading && uploadProgress && (
        <div
          className="vv-form-info-box"
          style={{ fontSize: "13px", marginBottom: 10 }}
        >
          {uploadProgress}
        </div>
      )}

      {fotos.length > 0 && (
        <div className="vv-media-grid">
          {fotos.map((url, i) => (
            <div
              key={i}
              className={`vv-media-item ${coverUrl === url ? "vv-media-item-cover" : ""}`}
              data-testid={`media-foto-${i}`}
            >
              <img
                src={fixStorageUrl(url)}
                alt={`Foto ${i + 1}`}
                className="vv-media-thumb"
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  const parent = el.parentElement;
                  if (parent && !parent.querySelector(".vv-media-fallback")) {
                    const fb = document.createElement("div");
                    fb.className = "vv-media-fallback";
                    fb.innerHTML =
                      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';
                    parent.insertBefore(fb, parent.firstChild);
                  }
                }}
              />

              <div className="vv-media-actions">
                {coverUrl !== url && (
                  <button
                    type="button"
                    className="vv-media-action-btn"
                    onClick={() => setCover(url)}
                    title="Usar como portada"
                    data-testid={`button-set-cover-${i}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  className="vv-media-action-btn vv-media-action-delete"
                  onClick={() => removeFoto(i)}
                  title="Eliminar"
                  data-testid={`button-delete-foto-${i}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {coverUrl === url && (
                <div className="vv-media-cover-label">Portada</div>
              )}
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="vv-media-grid" style={{ marginTop: 12 }}>
          {videos.map((url, i) => {
            const isPreview = videoPreviewUrl === url;
            return (
              <div
                key={i}
                className={`vv-media-item vv-media-item-video ${isPreview ? "vv-media-item-cover" : ""}`}
                data-testid={`media-video-${i}`}
              >
                <video
                  src={fixStorageUrl(url)}
                  className="vv-media-thumb"
                  preload="metadata"
                />
                <div className="vv-media-video-icon">
                  <svg viewBox="0 0 24 24" fill="#fff" stroke="none">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>

                <div className="vv-media-actions">
                  {onVideoPreviewChange && !isPreview && (
                    <button
                      type="button"
                      className="vv-media-action-btn"
                      onClick={() => setVideoPreview(url)}
                      title="Usar como video preview en el listado"
                      data-testid={`button-set-video-preview-${i}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="vv-media-action-btn vv-media-action-delete"
                    onClick={() => removeVideo(i)}
                    title="Eliminar"
                    data-testid={`button-delete-video-${i}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {isPreview && (
                  <div className="vv-media-cover-label">Preview</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) handleMultiUpload(files);
          e.target.value = "";
        }}
        data-testid="input-upload-foto"
      />

      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadVideo(f);
          e.target.value = "";
        }}
        data-testid="input-upload-video"
      />

      <div className="vv-media-upload-btns">
        <button
          type="button"
          className="vv-btn-secondary"
          disabled={uploading || !canAddFoto}
          onClick={() => fotoRef.current?.click()}
          data-testid="button-add-foto"
        >
          {uploading && uploadProgress
            ? uploadProgress
            : canAddFoto
              ? "Agregar fotos"
              : `Limite de fotos (25)`}
        </button>

        <button
          type="button"
          className="vv-btn-secondary"
          disabled={uploading || !canAddVideo}
          onClick={() => videoRef.current?.click()}
          data-testid="button-add-video"
        >
          {uploading && !uploadProgress
            ? "Subiendo..."
            : canAddVideo
              ? "Agregar video"
              : `Limite de videos (15)`}
        </button>
      </div>

      {false && !canAddFoto && fotos.length > 0 && (
        <p className="vv-media-upgrade-hint">
          <a href="/planes">Mejora tu plan</a> para subir mas fotos.
        </p>
      )}
    </div>
  );
}
