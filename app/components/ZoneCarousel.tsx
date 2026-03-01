"use client";

import Link from "next/link";
import { fixStorageUrl } from "@/lib/fixStorageUrl";

interface CarouselItem {
  id: string | number;
  nombre?: string;
  fotos_preview?: string[];
  cover_url?: string;
  fotos?: string[];
  categoria?: string;
}

type LinkMode = "profile" | "story";

interface ZoneCarouselProps {
  items: CarouselItem[];
  basePath: string;
  linkMode?: LinkMode; // ✅ NUEVO
}

function getProfileHref(item: CarouselItem, basePath: string): string {
  if (item.categoria) {
    const cat = item.categoria.toLowerCase();
    if (cat === "trans") return `/trans/${item.id}`;
    if (cat === "hombre") return `/hombres/${item.id}`;
    if (cat === "mujer") return `/mujeres/${item.id}`;
  }
  return `${basePath}/${item.id}`;
}

function getStoryHref(item: CarouselItem): string {
  // ✅ Story vive en /story y el id va por query
  return `/story?id=${encodeURIComponent(String(item.id))}`;
}

export default function ZoneCarousel({
  items,
  basePath,
  linkMode = "profile",
}: ZoneCarouselProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className="vv-zone-carousel-container"
      style={{ padding: "16px 0 8px", overflow: "hidden" }}
    >
      <div
        className="vv-zone-carousel-scroll"
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          padding: "0 16px",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`.vv-zone-carousel-scroll::-webkit-scrollbar { display: none; }`}</style>

        {items.map((item) => {
          const imgUrl =
            item.fotos_preview?.[0] || item.cover_url || item.fotos?.[0] || "";
          const href =
            linkMode === "story"
              ? getStoryHref(item)
              : getProfileHref(item, basePath);

          return (
            <Link
              key={item.id}
              href={href}
              prefetch={false}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
                textDecoration: "none",
                width: "72px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  border: "2px solid var(--gold, #c6a75e)",
                  padding: "2px",
                  background: "var(--bg-primary, #0a0a0a)",
                }}
              >
                {imgUrl ? (
                  <img
                    src={fixStorageUrl(imgUrl)}
                    alt={item.nombre}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: "#222",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      color: "#444",
                    }}
                  >
                    VIP
                  </div>
                )}
              </div>

              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary, #999999)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                  fontWeight: 500,
                }}
              >
                {item.nombre?.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
