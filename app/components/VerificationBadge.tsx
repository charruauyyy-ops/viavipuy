"use client";

import { useState } from "react";

const TOOLTIP_TEXT =
  "Este perfil completó el proceso de verificación de identidad de VIAVIP mediante documentación y validación facial. Estado activo y confirmado.";

const wrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: "12px 0 16px",
  padding: "10px 14px",
  borderRadius: 10,
  background: "rgba(16, 185, 129, 0.08)",
  border: "1px solid rgba(16, 185, 129, 0.35)",
  cursor: "default",
  position: "relative",
  transition: "box-shadow 0.2s",
};

const wrapHoverStyle: React.CSSProperties = {
  ...wrapStyle,
  boxShadow: "0 0 12px rgba(34, 197, 94, 0.15)",
};

const textStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#22c55e",
  fontSize: 13,
  lineHeight: 1.3,
};

const tooltipStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 8px)",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#1a1a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 12,
  lineHeight: 1.5,
  color: "rgba(255,255,255,0.75)",
  maxWidth: 280,
  zIndex: 50,
  pointerEvents: "none",
  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  whiteSpace: "normal",
};

export default function VerificationBadge({ verified }: { verified: boolean }) {
  const [hover, setHover] = useState(false);

  if (!verified) return null;

  return (
    <div
      style={hover ? wrapHoverStyle : wrapStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => setHover((h) => !h)}
      data-testid="badge-verified"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      <span style={textStyle}>Perfil verificado por VIAVIP</span>
      {hover && (
        <div style={tooltipStyle}>
          {TOOLTIP_TEXT}
        </div>
      )}
    </div>
  );
}
