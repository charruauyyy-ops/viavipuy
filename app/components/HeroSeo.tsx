import { HERO_TEXTS } from "@/lib/heroTexts";

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f5d27a 0%, #d4a94f 40%, #fff2b0 60%, #c6922e 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  fontWeight: 600,
  filter: "drop-shadow(0 0 14px rgba(245, 210, 122, 0.22))",
};

function highlightGold(text: string, gold: string) {
  const idx = text.toLowerCase().indexOf(gold.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + gold.length);
  const after = text.slice(idx + gold.length);
  return (
    <>
      {before}
      <span style={goldStyle}>{match}</span>
      {after}
    </>
  );
}

export default function HeroSeo({ sectionKey }: { sectionKey: string }) {
  const data = HERO_TEXTS[sectionKey];
  if (!data) return null;

  return (
    <div
      data-testid="hero-seo"
      style={{
        margin: "8px auto 10px",
        padding: "0 16px",
        maxWidth: 520,
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "clamp(16px, 3.8vw, 20px)",
          fontWeight: 500,
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          color: "#EAEAEA",
          margin: 0,
        }}
      >
        {highlightGold(data.title, data.gold)}
      </h1>
      {data.subtitle && (
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "clamp(12px, 3.2vw, 14px)",
            fontWeight: 400,
            color: "#EAEAEA",
            opacity: 0.6,
            margin: "6px 0 0",
            lineHeight: 1.3,
          }}
        >
          {data.subtitle}
        </p>
      )}
    </div>
  );
}
