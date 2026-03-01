"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import { getSupabase } from "@/lib/supabaseClient";
import { getPlanConfig } from "@/lib/plans";
import { getLocalFavorites } from "@/lib/favoritesLocal";
import FavoritoButton from "@/app/components/FavoritoButton";

interface Publicacion {
  id: string;
  nombre?: string;
  edad?: number;
  zona?: string;
  ciudad?: string;
  cover_url?: string;
  disponible?: boolean;
  rating?: number;
  categoria?: string;
  user_id?: string;
  plan_actual?: string;
  precio?: number | null;
  mostrar_precio?: boolean;
}

function StarIcon() {
  return <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
}

function PlanBadge({ planId }: { planId: string }) {
  if (!planId || planId === "free") return null;
  const config = getPlanConfig(planId);
  return <div className="vv-card-plan-badge" style={{ background: config.badge_bg, color: config.badge_text }}>{config.name}</div>;
}

const CAT_PATH: Record<string, string> = {
  mujer: "/mujeres",
  hombre: "/hombres",
  trans: "/trans",
};

export default function FavoritosPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Publicacion[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      let favIds: string[] = [];
      let isLoggedIn = false;

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          isLoggedIn = true;
          const { data: favs } = await supabase
            .from("favoritos")
            .select("publicacion_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (favs && favs.length > 0) {
            favIds = favs.map((f: { publicacion_id: string }) => f.publicacion_id);
          }
        }
      }

      if (!isLoggedIn) {
        favIds = getLocalFavorites();
      }

      if (favIds.length === 0) {
        setLoading(false);
        return;
      }

      if (!supabase) { setLoading(false); return; }

      const chunks: string[][] = [];
      for (let i = 0; i < favIds.length; i += 100) {
        chunks.push(favIds.slice(i, i + 100));
      }

      let allPubs: Publicacion[] = [];
      for (const chunk of chunks) {
        const { data: pubs } = await supabase
          .from("publicaciones")
          .select("id, nombre, edad, zona, ciudad, cover_url, disponible, rating, categoria, user_id, precio, mostrar_precio")
          .in("id", chunk);
        if (pubs) allPubs = allPubs.concat(pubs as Publicacion[]);
      }

      if (allPubs.length > 0) {
        const userIds = allPubs.map((p) => p.user_id).filter(Boolean) as string[];
        let planMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, plan_actual, plan_estado").in("id", userIds);
          if (profiles) {
            for (const p of profiles) {
              planMap[p.id] = p.plan_estado === "activo" ? (p.plan_actual || "free") : "free";
            }
          }
        }
        const ordered: Publicacion[] = [];
        for (const pid of favIds) {
          const found = allPubs.find((p) => p.id === pid);
          if (found) {
            ordered.push({
              ...found,
              plan_actual: found.user_id ? planMap[found.user_id] || "free" : "free",
            });
          }
        }
        setItems(ordered);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleUnfav(pubId: string) {
    setRemovedIds((prev) => new Set(prev).add(pubId));
  }

  const visibleItems = items.filter((i) => !removedIds.has(i.id));

  if (loading) {
    return (
      <main>
        <div className="vv-page-header"><h1 className="vv-page-title">Favoritos</h1></div>
        <div className="vv-empty">Cargando...</div>
      </main>
    );
  }

  return (
    <main>
      <div className="vv-page-header">
        <h1 className="vv-page-title">Favoritos</h1>
        {visibleItems.length > 0 && <p className="vv-page-subtitle">{visibleItems.length} favorito{visibleItems.length !== 1 ? "s" : ""}</p>}
      </div>
      {visibleItems.length === 0 ? (
        <div className="vv-empty" data-testid="text-empty-favs">No tenes favoritos aun</div>
      ) : (
        <div className="vv-grid">
          {visibleItems.map((item) => {
            const nombre = item.nombre || "Sin nombre";
            const edad = item.edad || null;
            const zona = item.zona || item.ciudad || "";
            const disponible = item.disponible !== undefined ? item.disponible : true;
            const rating = item.rating != null ? item.rating : 4.8;
            const basePath = CAT_PATH[item.categoria || "mujer"] || "/mujeres";
            return (
              <div key={item.id} className="vv-card" data-testid={`card-fav-${item.id}`}>
                <Link href={`${basePath}/${item.id}`} className="vv-card-link">
                  <div className="vv-card-img-wrap">
                    {item.cover_url ? <img src={fixStorageUrl(item.cover_url)} alt={nombre} className="vv-card-img" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <div className="vv-card-img-placeholder" />}
                    {disponible && <div className="vv-card-badge vv-card-badge-disponible">Disponible</div>}
                    <PlanBadge planId={item.plan_actual || ""} />
                    <div className="vv-card-top-right">
                      <FavoritoButton publicacionId={item.id} size={18} onToggleOff={() => handleUnfav(item.id)} />
                      {item.mostrar_precio && item.precio != null && (
                        <div data-testid="badge-precio" style={{ background: "#ffffff", color: "#000000", fontSize: "11px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}>${item.precio}</div>
                      )}
                    </div>
                    <div className="vv-card-overlay">
                      <p className="vv-card-name">{nombre}{edad ? `, ${edad}` : ""}</p>
                      {zona && <p className="vv-card-detail">{zona}</p>}
                    </div>
                    <div className="vv-card-rating"><StarIcon />{rating.toFixed(1)}</div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
