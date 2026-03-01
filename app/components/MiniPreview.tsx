"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { fixStorageUrl } from "@/lib/fixStorageUrl";

interface MiniPreviewProps {
  fotos: string[];
  nombre: string;
  profileUrl: string;
  onClose: () => void;
}

export default function MiniPreview({ fotos, nombre, profileUrl, onClose }: MiniPreviewProps) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgs = fotos.slice(0, 5);
  const total = imgs.length;

  useEffect(() => {
    const savedPos = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedPos}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, savedPos);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setIdx((i) => (i < total - 1 ? i + 1 : i)), [total]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDelta.current = delta;
    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (touchDelta.current < -50) next();
    else if (touchDelta.current > 50) prev();
    setDragOffset(0);
    touchDelta.current = 0;
  };

  const goToProfile = () => {
    onClose();
    router.push(profileUrl);
  };

  const content = (
    <div
      className="vv-mp-overlay"
      onClick={onClose}
      data-testid="mini-preview-overlay"
    >
      <div
        className="vv-mp-container"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        data-testid="mini-preview-container"
      >
        <div className="vv-mp-inner">
          <div
            className="vv-mp-gallery"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="vv-mp-track"
              style={{
                transform: `translateX(calc(-${idx * 100}% + ${dragOffset}px))`,
                transition: dragOffset !== 0 ? "none" : "transform 0.3s ease",
              }}
            >
              {imgs.map((url, i) => (
                <div className="vv-mp-slide" key={i}>
                  <img
                    src={fixStorageUrl(url)}
                    alt={`${nombre} foto ${i + 1}`}
                    className="vv-mp-img"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            <button className="vv-mp-close" onClick={onClose} aria-label="Cerrar" data-testid="mini-preview-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {total > 1 && idx > 0 && (
              <button className="vv-mp-arrow vv-mp-arrow-l" onClick={prev} data-testid="mini-preview-prev">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {total > 1 && idx < total - 1 && (
              <button className="vv-mp-arrow vv-mp-arrow-r" onClick={next} data-testid="mini-preview-next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {total > 1 && (
              <div className="vv-mp-dots">
                {imgs.map((_, i) => (
                  <span
                    key={i}
                    className={`vv-mp-dot${i === idx ? " vv-mp-dot-active" : ""}`}
                    onClick={() => setIdx(i)}
                  />
                ))}
              </div>
            )}
          </div>

          <button className="vv-mp-cta" onClick={goToProfile} data-testid="mini-preview-ver-perfil">
            Ver perfil
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(content, document.body);
}
