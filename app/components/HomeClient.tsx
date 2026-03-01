"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AgeGateModal from "@/app/components/AgeGateModal";

function hasAgeOk(): boolean {
  return document.cookie.includes("viavip_age_ok=1");
}

function setAgeOk(): void {
  document.cookie = "viavip_age_ok=1; max-age=31536000; path=/";
}

export default function HomeClient() {
  const router = useRouter();
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const vid = videoRef.current;
    if (!vid) return;

    function tryPlay() {
      if (!vid) return;
      vid.play().catch(() => {});
    }

    tryPlay();

    const onTouch = () => tryPlay();
    window.addEventListener("touchstart", onTouch, { once: true });
    window.addEventListener("scroll", onTouch, { once: true });

    return () => {
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("scroll", onTouch);
    };
  }, [reduceMotion]);

  function handleNavClick(e: React.MouseEvent, href: string) {
    e.preventDefault();
    if (hasAgeOk()) {
      router.push(href);
      return;
    }
    setPendingHref(href);
    setShowGate(true);
  }

  function handleAccept() {
    setAgeOk();
    setShowGate(false);
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  }

  function handleDecline() {
    // Declinar debe tener un efecto visible: cerrar y salir del sitio.
    // Si preferís solo cerrar el modal y quedarte en Home, dejá solo setShowGate(false).
    setShowGate(false);
    setPendingHref(null);
    try {
      window.location.assign("https://www.google.com/");
    } catch {
      // noop
    }
  }

  return (
    <main className="vvl-landing">
      <div className="vvl-bg-layer">
        {!reduceMotion && (
          <video
            ref={videoRef}
            className="vvl-bg-video"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
          >
            <source
              src="/videos/viavip_gold_particles_optimized.mp4"
              type="video/mp4"
            />
          </video>
        )}
        <div className="vvl-bg-overlay" />
      </div>

      <div className="vvl-content">
        <div className="vvl-logo-block">
          <h1 className="vvl-logo" data-testid="text-logo">
            VIAVIP
          </h1>
          <div className="vvl-logo-line" />
        </div>

        <h2 className="vvl-headline" data-testid="text-headline">
          Escorts verificadas
          <br />
          en Uruguay
        </h2>
        <p className="vvl-subheadline" data-testid="text-subheadline">
          Premium. Discreto. Seguro.
        </p>

        <div className="vvl-ctas">
          <a
            href="/mujeres"
            className="vvl-cta-btn"
            data-testid="link-mujeres"
            onClick={(e) => handleNavClick(e, "/mujeres")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="vvl-cta-icon"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
            </svg>
            Ver Mujeres
          </a>
          <a
            href="/trans"
            className="vvl-cta-btn"
            data-testid="link-trans"
            onClick={(e) => handleNavClick(e, "/trans")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="vvl-cta-icon"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="3" x2="12" y2="7" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="5.6" y1="5.6" x2="8.5" y2="8.5" />
              <line x1="15.5" y1="15.5" x2="18.4" y2="18.4" />
            </svg>
            Ver Trans
          </a>
          <a
            href="/hombres"
            className="vvl-cta-btn"
            data-testid="link-hombres"
            onClick={(e) => handleNavClick(e, "/hombres")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="vvl-cta-icon"
            >
              <circle cx="10" cy="14" r="5" />
              <line x1="21" y1="3" x2="13.5" y2="10.5" />
              <line x1="16" y1="3" x2="21" y2="3" />
              <line x1="21" y1="3" x2="21" y2="8" />
            </svg>
            Ver Hombres
          </a>
        </div>

        <div className="vvl-trust-row">
          <div className="vvl-trust-card" data-testid="trust-verificados">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c6a75e"
              strokeWidth="1.5"
              className="vvl-trust-icon"
            >
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="vvl-trust-label">
              Perfiles
              <br />
              verificados
            </span>
          </div>
          <div className="vvl-trust-card" data-testid="trust-experiencias">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c6a75e"
              strokeWidth="1.5"
              className="vvl-trust-icon"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="vvl-trust-label">
              Experiencias
              <br />
              reales
            </span>
          </div>
          <div className="vvl-trust-card" data-testid="trust-contacto">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c6a75e"
              strokeWidth="1.5"
              className="vvl-trust-icon"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="vvl-trust-label">
              Contacto
              <br />
              directo
            </span>
          </div>
        </div>

        <button
          className="vvl-toggle"
          onClick={() => setInfoExpanded(!infoExpanded)}
          data-testid="button-ver-mas-info"
        >
          {infoExpanded ? "Ver menos" : "Ver mas"}
        </button>

        {infoExpanded && (
          <div className="vvl-info-expanded" data-testid="text-info-expanded">
            <p>
              VIAVIP es la plataforma premium de Uruguay para encuentros
              discretos y seguros. Todos los perfiles pasan por un proceso de
              verificacion de identidad para garantizar autenticidad. Nuestra
              comunidad permite dejar opiniones y comentarios para que tomes la
              mejor decision.
            </p>
          </div>
        )}

        <div className="vvl-footer-space" />
      </div>

      {showGate && (
        <AgeGateModal onAccept={handleAccept} onDecline={handleDecline} />
      )}
    </main>
  );
}
