"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import StoryViewer from "./StoryViewer";

interface CaptionJson {
  line1?: string;
  line2?: string;
  color1?: string;
  color2?: string;
}

interface DiamStory {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  caption_json?: CaptionJson | null;
  created_at: string;
  expires_at: string;
  nombre: string;
  zona: string;
  avatar_url?: string;
}

interface Props {
  categoria?: "mujer" | "hombre" | "trans";
  // CAMBIO: permitir barrios además de mvd/pde
  zona?: "mvd" | "pde" | string;
}

export default function DestacadasDiamante({ categoria, zona }: Props = {}) {
  const [stories, setStories] = useState<DiamStory[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const supabase = getSupabase();
      if (!supabase) return;

      const nowIso = new Date().toISOString();

      const { data: raw, error } = await supabase
        .from("diamante_stories")
        .select(
          "id, user_id, media_url, media_type, caption, caption_json, created_at, expires_at",
        )
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error || !raw || raw.length === 0) {
        if (alive) setStories([]);
        return;
      }

      const seen = new Set<string>();
      const dedup = raw.filter((s: { user_id: string }) => {
        if (seen.has(s.user_id)) return false;
        seen.add(s.user_id);
        return true;
      });

      const userIds = dedup.map((s: { user_id: string }) => s.user_id);

      let pubQuery = supabase
        .from("publicaciones")
        .select(
          "user_id, nombre, zona, ciudad, cover_url, categoria, departamento",
        )
        .in("user_id", userIds)
        .eq("estado_publicacion", "activo");

      if (categoria) pubQuery = pubQuery.eq("categoria", categoria);

      if (zona === "mvd") {
        pubQuery = pubQuery.eq("departamento", "Montevideo");
      } else if (zona === "pde") {
        pubQuery = pubQuery
          .eq("departamento", "Maldonado")
          .ilike("zona", "%Punta del Este%");
      } else if (zona) {
        // NUEVO: soporte barrios (centro, carrasco, pocitos, etc.)
        pubQuery = pubQuery.ilike("zona", `%${zona}%`);
      }

      const { data: pubs } = await pubQuery;

      const pubMap: Record<
        string,
        { nombre: string; zona: string; avatar_url?: string }
      > = {};

      if (pubs) {
        for (const p of pubs as any[]) {
          pubMap[p.user_id] = {
            nombre: p.nombre || "Perfil",
            zona: p.zona || p.ciudad || "",
            avatar_url: p.cover_url || undefined,
          };
        }
      }

      const filtered =
        categoria || zona ? dedup.filter((s: any) => pubMap[s.user_id]) : dedup;

      const merged: DiamStory[] = filtered.map((s: any) => {
        const info = pubMap[s.user_id] || { nombre: "Perfil", zona: "" };
        return {
          ...s,
          nombre: info.nombre,
          zona: info.zona,
          avatar_url: info.avatar_url,
        };
      });

      if (alive) setStories(merged);
    }

    load();
    return () => {
      alive = false;
    };
  }, [categoria, zona]);

  if (stories.length === 0) return null;

  return (
    <>
      <section className="vv-stories-section">
        <div className="vv-stories-scroll" style={{ marginTop: 16 }}>
          {stories.map((s, i) => (
            <button
              key={s.id}
              className="vv-story-item"
              onClick={() => setViewerIndex(i)}
              data-testid={`story-destacada-${s.id}`}
            >
              <div className="vv-story-circle">
                {s.avatar_url ? (
                  <img
                    src={fixStorageUrl(s.avatar_url)}
                    alt={s.nombre}
                    className="vv-story-img"
                    loading="lazy"
                    draggable={false}
                  />
                ) : (
                  <div className="vv-story-placeholder">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="vv-story-name">
                {(s.nombre || "").split(" ")[0] || "Perfil"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
