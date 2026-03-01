"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { isLocalFavorite, toggleLocalFavorite } from "@/lib/favoritesLocal";

interface FavoritoButtonProps {
  publicacionId: string;
  className?: string;
  size?: number;
  onToggleOff?: () => void;
  isFav?: boolean;
  onToggle?: (publicacionId: string) => Promise<void>;
  disabled?: boolean;
}

export default function FavoritoButton({
  publicacionId,
  className = "",
  size = 20,
  onToggleOff,
  isFav: controlledFav,
  onToggle: controlledToggle,
  disabled: controlledDisabled,
}: FavoritoButtonProps) {
  const controlled = controlledFav !== undefined && controlledToggle !== undefined;

  const [selfFav, setSelfFav] = useState(false);
  const [loading, setLoading] = useState(!controlled);
  const [toggling, setToggling] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<"local" | "db">("local");

  useEffect(() => {
    if (controlled) return;
    let cancelled = false;
    async function checkFav() {
      const supabase = getSupabase();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          setUserId(user.id);
          setMode("db");
          const { data } = await supabase
            .from("favoritos")
            .select("id")
            .eq("user_id", user.id)
            .eq("publicacion_id", publicacionId)
            .maybeSingle();
          if (cancelled) return;
          setSelfFav(!!data);
          setLoading(false);
          return;
        }
      }
      if (cancelled) return;
      setMode("local");
      setSelfFav(isLocalFavorite(publicacionId));
      setLoading(false);
    }
    checkFav();
    return () => { cancelled = true; };
  }, [publicacionId, controlled]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (controlled) {
      const wasFavBefore = controlledFav;
      await controlledToggle!(publicacionId);
      if (wasFavBefore && onToggleOff) onToggleOff();
      return;
    }

    if (toggling) return;
    setToggling(true);

    if (mode === "local") {
      const { nowFav } = toggleLocalFavorite(publicacionId);
      setSelfFav(nowFav);
      if (!nowFav && onToggleOff) onToggleOff();
      setToggling(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase || !userId) { setToggling(false); return; }

    const next = !selfFav;
    setSelfFav(next);

    if (next) {
      const { error } = await supabase
        .from("favoritos")
        .upsert(
          { user_id: userId, publicacion_id: publicacionId },
          { onConflict: "user_id,publicacion_id" }
        );
      if (error) setSelfFav(false);
    } else {
      const { error } = await supabase
        .from("favoritos")
        .delete()
        .eq("user_id", userId)
        .eq("publicacion_id", publicacionId);
      if (error) { setSelfFav(true); }
      else if (onToggleOff) { onToggleOff(); }
    }
    setToggling(false);
  }, [controlled, controlledToggle, controlledFav, userId, selfFav, toggling, publicacionId, onToggleOff, mode]);

  const active = controlled ? controlledFav : selfFav;
  const isDisabled = controlled ? !!controlledDisabled : loading;

  return (
    <button
      className={`vv-fav-toggle ${active ? "vv-fav-active" : ""} ${className}`}
      onClick={toggle}
      disabled={isDisabled}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      data-testid={`button-fav-${publicacionId}`}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill={active ? "#e11d48" : "none"} stroke={active ? "#e11d48" : "#fff"} strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
