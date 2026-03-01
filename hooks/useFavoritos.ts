"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import {
  getLocalFavorites,
  toggleLocalFavorite,
  clearLocalFavorites,
  getMigrationFlag,
  setMigrationFlag,
} from "@/lib/favoritesLocal";
import { fetchDbFavoritesForIds, migrateLocalToDb } from "@/lib/favoritesDb";

interface UseFavoritosReturn {
  favSet: Set<string>;
  toggleFavorito: (publicacionId: string) => Promise<void>;
  loadingIds: Set<string>;
  userId: string | null;
  ready: boolean;
}

export function useFavoritos(publicacionIds: string[]): UseFavoritosReturn {
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const modeRef = useRef<"local" | "db">("local");

  const stableKey = useMemo(() => {
    const unique = [...new Set(publicacionIds)].sort();
    return JSON.stringify(unique);
  }, [publicacionIds]);

  const stableIds = useMemo(() => {
    return [...new Set(publicacionIds)];
  }, [stableKey]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const supabase = getSupabase();

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          setUserId(user.id);
          userIdRef.current = user.id;
          modeRef.current = "db";

          if (!getMigrationFlag(user.id)) {
            const localIds = getLocalFavorites();
            if (localIds.length > 0) {
              const { error } = await migrateLocalToDb(supabase, localIds);
              if (cancelled) return;
              if (!error) {
                clearLocalFavorites();
                setMigrationFlag(user.id);
              }
            } else {
              setMigrationFlag(user.id);
            }
          }

          if (stableIds.length > 0) {
            const dbFavs = await fetchDbFavoritesForIds(supabase, user.id, stableIds);
            if (cancelled) return;
            setFavSet(new Set(dbFavs));
          }

          setReady(true);
          return;
        }
      }

      modeRef.current = "local";
      const localIds = getLocalFavorites();
      const localSet = new Set(localIds);
      const visible = new Set(stableIds.filter((id) => localSet.has(id)));
      setFavSet(visible);
      setReady(true);
    }

    hydrate();
    return () => { cancelled = true; };
  }, [stableKey]);

  const toggleFavorito = useCallback(async (publicacionId: string) => {
    setLoadingIds((prev) => {
      if (prev.has(publicacionId)) return prev;
      const next = new Set(prev);
      next.add(publicacionId);
      return next;
    });

    if (modeRef.current === "local") {
      const { nowFav } = toggleLocalFavorite(publicacionId);
      setFavSet((prev) => {
        const next = new Set(prev);
        if (nowFav) next.add(publicacionId);
        else next.delete(publicacionId);
        return next;
      });
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(publicacionId);
        return next;
      });
      return;
    }

    const supabase = getSupabase();
    const uid = userIdRef.current;
    if (!supabase || !uid) {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(publicacionId);
        return next;
      });
      return;
    }

    let wasFav = false;
    setFavSet((prev) => {
      wasFav = prev.has(publicacionId);
      const next = new Set(prev);
      if (wasFav) next.delete(publicacionId);
      else next.add(publicacionId);
      return next;
    });

    try {
      if (wasFav) {
        const { error } = await supabase
          .from("favoritos")
          .delete()
          .eq("user_id", uid)
          .eq("publicacion_id", publicacionId);
        if (error) {
          setFavSet((prev) => new Set(prev).add(publicacionId));
        }
      } else {
        const { error } = await supabase
          .from("favoritos")
          .upsert(
            { user_id: uid, publicacion_id: publicacionId },
            { onConflict: "user_id,publicacion_id" }
          );
        if (error) {
          setFavSet((prev) => {
            const next = new Set(prev);
            next.delete(publicacionId);
            return next;
          });
        }
      }
    } catch {
      setFavSet((prev) => {
        const next = new Set(prev);
        if (wasFav) next.add(publicacionId);
        else next.delete(publicacionId);
        return next;
      });
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(publicacionId);
      return next;
    });
  }, []);

  return { favSet, toggleFavorito, loadingIds, userId, ready };
}
