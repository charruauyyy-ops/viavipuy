"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import {
  getLocalFavorites,
  clearLocalFavorites,
  getMigrationFlag,
  setMigrationFlag,
} from "@/lib/favoritesLocal";
import { migrateLocalToDb } from "@/lib/favoritesDb";

export default function FavoritosMigrator() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase = getSupabase();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
          const userId = session.user.id;
          if (getMigrationFlag(userId)) return;

          const localIds = getLocalFavorites();
          if (localIds.length > 0) {
            const { error } = await migrateLocalToDb(supabase, localIds);
            if (!error) {
              clearLocalFavorites();
              setMigrationFlag(userId);
            }
          } else {
            setMigrationFlag(userId);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
