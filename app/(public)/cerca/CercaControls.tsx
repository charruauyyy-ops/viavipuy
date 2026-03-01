"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CercaControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  const handleGetLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("La geolocalización no es compatible con tu navegador.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        router.push(`/cerca?lat=${latitude}&lon=${longitude}&radius=3000&limit=60`);
        setLoading(false);
      },
      (err) => {
        console.error("Error obteniendo ubicación:", err);
        setError("No se pudo obtener tu ubicación. Por favor, verifica los permisos.");
        setLoading(false);
      }
    );
  };

  return (
    <div className="vv-cerca-controls" style={{ padding: "0 20px 20px", textAlign: "center" }}>
      {!lat || !lon ? (
        <button
          onClick={handleGetLocation}
          disabled={loading}
          className="vv-btn-primary"
          style={{
            background: "var(--gold, #c6a75e)",
            color: "#000",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            width: "100%",
            maxWidth: "300px",
            transition: "opacity 0.2s"
          }}
        >
          {loading ? "BUSCANDO..." : "USAR MI UBICACIÓN"}
        </button>
      ) : (
        <button
          onClick={handleGetLocation}
          disabled={loading}
          className="vv-btn-outline"
          style={{
            background: "transparent",
            color: "var(--gold, #c6a75e)",
            border: "1px solid var(--gold, #c6a75e)",
            padding: "8px 16px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "12px",
            cursor: "pointer",
            transition: "opacity 0.2s"
          }}
        >
          {loading ? "ACTUALIZANDO..." : "ACTUALIZAR UBICACIÓN"}
        </button>
      )}

      {error && (
        <p style={{ color: "#ff4d4d", fontSize: "13px", marginTop: "12px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
