"use client";

import { useEffect } from "react";

interface AgeGateModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function AgeGateModal({
  onAccept,
  onDecline,
}: AgeGateModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape = declinar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDecline();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDecline]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        padding: "16px",
        pointerEvents: "auto",
      }}
      data-testid="age-gate-overlay"
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(198,167,94,0.3)",
          borderRadius: "16px",
          padding: "32px 24px",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
          pointerEvents: "auto",
        }}
        data-testid="age-gate-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          // Evita que algún handler externo capture el click y bloquee los botones
          e.stopPropagation();
        }}
      >
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            color: "#c6a75e",
            fontSize: "28px",
            marginBottom: "8px",
            letterSpacing: "3px",
          }}
        >
          VIAVIP
        </h2>
        <div
          style={{
            width: "40px",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, #c6a75e, transparent)",
            margin: "0 auto 20px",
          }}
        />
        <p
          style={{
            color: "#e0e0e0",
            fontSize: "15px",
            lineHeight: "1.6",
            marginBottom: "24px",
          }}
        >
          Este sitio contiene contenido exclusivo para adultos mayores de 18
          anos. Al ingresar, confirmas que eres mayor de edad y aceptas nuestros{" "}
          <a
            href="/terminos-y-condiciones"
            style={{ color: "#c6a75e", textDecoration: "underline" }}
            data-testid="link-terminos"
          >
            terminos y condiciones
          </a>
          .
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDecline();
            }}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#999",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
            data-testid="button-decline"
          >
            Declinar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAccept();
            }}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #c6a75e, #a88b3d)",
              color: "#0a0a0a",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              pointerEvents: "auto",
            }}
            data-testid="button-accept"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
