"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getPlanConfig } from "@/lib/plans";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import { isDisponibleAhora } from "@/lib/disponibilidad";
import { useFavoritos } from "@/hooks/useFavoritos";
import FavoritoButton from "./FavoritoButton";
import MiniPreview from "./MiniPreview";

function CardMedia({
  coverUrl,
  videoPreviewUrl,
  nombre,
  mounted,
}: {
  coverUrl?: string;
  videoPreviewUrl?: string | null;
  nombre: string;
  mounted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const showVideo = mounted && !!videoPreviewUrl && !videoError;

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [showVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const LIMIT = 4;
    const handleTimeUpdate = () => {
      if (video.currentTime >= LIMIT) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [showVideo]);

  return (
    <>
      {coverUrl ? (
        <img
          src={fixStorageUrl(coverUrl)}
          alt={nombre}
          className="vv-card-img"
          loading="lazy"
          style={showVideo ? { position: "absolute", opacity: 0 } : undefined}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="vv-card-img-placeholder" />
      )}
      {showVideo && (
        <video
          ref={videoRef}
          src={fixStorageUrl(videoPreviewUrl!)}
          className="vv-card-img"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          style={{ objectFit: "cover" }}
          onError={() => setVideoError(true)}
        />
      )}
    </>
  );
}

interface Publicacion {
  id: string | number;
  nombre?: string;
  edad?: number;
  zona?: string;
  ciudad?: string;
  cover_url?: string;
  fotos?: string[];
  fotos_preview?: string[];
  video_preview_url?: string | null;
  disponible?: boolean;
  ultima_actividad?: string;
  rating?: number;
  plan_actual?: string;
  categoria?: string;
  precio?: number | null;
  mostrar_precio?: boolean;
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function PlanBadge({
  planId,
  hasDisponible,
}: {
  planId: string;
  hasDisponible: boolean;
}) {
  if (!planId || planId === "free") return null;
  const config = getPlanConfig(planId);
  return (
    <div
      className="vv-card-plan-badge"
      style={{
        background: config.badge_bg,
        color: config.badge_text,
        top: hasDisponible ? 32 : 8,
        height: "24px",
        fontSize: "11px",
        fontWeight: "700",
        padding: "0 10px",
        borderRadius: "10px",
        letterSpacing: "0.06em",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {config.name}
    </div>
  );
}

function PriceBadge({ precio, mostrar, mobile }: { precio?: number | null; mostrar?: boolean; mobile?: boolean }) {
  if (!mostrar || precio == null) return null;
  return (
    <div
      data-testid="badge-precio"
      style={{
        background: "#ffffff",
        color: "#000000",
        fontSize: mobile ? "11px" : "12px",
        fontWeight: 700,
        padding: mobile ? "3px 8px" : "4px 10px",
        borderRadius: "999px",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "auto",
        pointerEvents: "none",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
      }}
    >
      ${precio}
    </div>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  return mobile;
}

function getProfileHref(item: Publicacion, basePath: string): string {
  if (item.categoria) {
    const cat = item.categoria.toLowerCase();
    if (cat === "trans") return `/trans/${item.id}`;
    if (cat === "hombre") return `/hombres/${item.id}`;
    if (cat === "mujer") return `/mujeres/${item.id}`;
  }
  return `${basePath}/${item.id}`;
}

interface ListadoGridProps {
  items: Publicacion[];
  basePath: string;
}

export default function ListadoGrid({ items, basePath }: ListadoGridProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const ids = useMemo(() => items.map((i) => String(i.id)), [items]);
  const { favSet, toggleFavorito, loadingIds } = useFavoritos(ids);
  const isMobile = useIsMobile();
  const router = useRouter();

  const [previewData, setPreviewData] = useState<{
    fotos: string[];
    nombre: string;
    profileUrl: string;
  } | null>(null);

  const openPreview = useCallback(
    (item: Publicacion) => {
      const preview =
        item.fotos_preview && item.fotos_preview.length > 0
          ? item.fotos_preview
          : (item.fotos || []).slice(0, 5);
      if (preview.length === 0) return false;
      setPreviewData({
        fotos: preview,
        nombre: item.nombre || "Sin nombre",
        profileUrl: getProfileHref(item, basePath),
      });
      return true;
    },
    [basePath],
  );

  const closePreview = useCallback(() => setPreviewData(null), []);

  const handleCardClick = useCallback(
    (e: React.MouseEvent, item: Publicacion) => {
      if (!isMobile) return;
      const preview =
        item.fotos_preview && item.fotos_preview.length > 0
          ? item.fotos_preview
          : (item.fotos || []).slice(0, 5);
      if (preview.length === 0) {
        router.push(getProfileHref(item, basePath));
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      openPreview(item);
    },
    [isMobile, openPreview, basePath, router],
  );

  const handleDesktopCardClick = useCallback(
    (e: React.MouseEvent, item: Publicacion) => {
      if (isMobile) return;
      const preview =
        item.fotos_preview && item.fotos_preview.length > 0
          ? item.fotos_preview
          : (item.fotos || []).slice(0, 5);
      if (preview.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        openPreview(item);
      } else {
        router.push(getProfileHref(item, basePath));
      }
    },
    [isMobile, openPreview, basePath, router],
  );

  return (
    <>
      <div className="vv-grid">
        {items.map((item) => {
          const pubId = String(item.id);
          const nombre = item.nombre || "Sin nombre";
          const edad = item.edad || null;
          const zona = item.zona || item.ciudad || "";
          const disponible = mounted
            ? isDisponibleAhora(item.disponible, item.ultima_actividad)
            : false;
          const rating = item.rating != null ? item.rating : 4.8;
          const profileUrl = getProfileHref(item, basePath);

          return (
            <div
              key={item.id}
              className="vv-card"
              data-testid={`card-${item.id}`}
            >
              <div
                className="vv-card-link"
                onClick={(e) => isMobile ? handleCardClick(e, item) : handleDesktopCardClick(e, item)}
                role="button"
                tabIndex={0}
                style={{ cursor: "pointer" }}
              >
                <div className="vv-card-img-wrap">
                  <CardMedia
                    coverUrl={item.cover_url}
                    videoPreviewUrl={item.video_preview_url}
                    nombre={nombre}
                    mounted={mounted}
                  />
                  {disponible && (
                    <div
                      className="vv-card-badge vv-card-badge-disponible"
                      data-testid={`badge-disponible-${item.id}`}
                    >
                      Disponible
                    </div>
                  )}
                  <PlanBadge
                    planId={item.plan_actual || ""}
                    hasDisponible={disponible}
                  />
                  <div className="vv-card-top-right">
                    <FavoritoButton
                      publicacionId={pubId}
                      size={18}
                      isFav={favSet.has(pubId)}
                      onToggle={toggleFavorito}
                      disabled={loadingIds.has(pubId)}
                    />
                    <PriceBadge precio={item.precio} mostrar={item.mostrar_precio} mobile={isMobile} />
                  </div>
                  <div className="vv-card-overlay">
                    <p
                      className="vv-card-name"
                      data-testid={`text-name-${item.id}`}
                    >
                      {nombre}
                      {edad ? `, ${edad}` : ""}
                    </p>
                    {zona && (
                      <p
                        className="vv-card-detail"
                        data-testid={`text-zona-${item.id}`}
                      >
                        {zona}
                      </p>
                    )}
                  </div>
                  <div
                    className="vv-card-rating"
                    data-testid={`text-rating-${item.id}`}
                  >
                    <StarIcon />
                    {rating.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {previewData && (
        <MiniPreview
          fotos={previewData.fotos}
          nombre={previewData.nombre}
          profileUrl={previewData.profileUrl}
          onClose={closePreview}
        />
      )}
    </>
  );
}
