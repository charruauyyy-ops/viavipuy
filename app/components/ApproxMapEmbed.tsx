interface ApproxMapEmbedProps {
  zona?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
}

export default function ApproxMapEmbed({ zona, ciudad, departamento }: ApproxMapEmbedProps) {
  if (!ciudad && !departamento) return null;

  const parts = [zona, ciudad, departamento, "Uruguay"].filter(Boolean) as string[];
  const q = encodeURIComponent(parts.join(", "));

  return (
    <div style={{ margin: "16px 0" }}>
      <h3 className="vv-approx-map-title">Ubicacion aproximada</h3>
      <p className="vv-approx-map-subtitle">Zona estimada (no exacta)</p>
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          padding: 10,
          background: "rgba(255,255,255,0.03)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        }}
      >
        <iframe
          src={`https://www.google.com/maps?q=${q}&output=embed`}
          className="vv-approx-map-iframe"
          style={{ border: 0, display: "block", width: "100%", borderRadius: 12 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen={false}
          title="Ubicacion aproximada"
        />
      </div>
    </div>
  );
}
