import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchDbFavorites(supabase: SupabaseClient): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favoritos")
    .select("publicacion_id")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((d: { publicacion_id: string }) => d.publicacion_id);
}

export async function fetchDbFavoritesForIds(
  supabase: SupabaseClient,
  userId: string,
  publicacionIds: string[]
): Promise<string[]> {
  if (publicacionIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < publicacionIds.length; i += 100) {
    chunks.push(publicacionIds.slice(i, i + 100));
  }

  const results: string[] = [];
  for (const chunk of chunks) {
    const { data } = await supabase
      .from("favoritos")
      .select("publicacion_id")
      .eq("user_id", userId)
      .in("publicacion_id", chunk);
    if (data) {
      results.push(...data.map((d: { publicacion_id: string }) => d.publicacion_id));
    }
  }
  return results;
}

export async function addDbFavorite(
  supabase: SupabaseClient,
  publicacionId: string
): Promise<{ error: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: true };

  const { error } = await supabase
    .from("favoritos")
    .upsert(
      { user_id: user.id, publicacion_id: publicacionId },
      { onConflict: "user_id,publicacion_id" }
    );

  return { error: !!error };
}

export async function removeDbFavorite(
  supabase: SupabaseClient,
  publicacionId: string
): Promise<{ error: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: true };

  const { error } = await supabase
    .from("favoritos")
    .delete()
    .eq("user_id", user.id)
    .eq("publicacion_id", publicacionId);

  return { error: !!error };
}

export async function migrateLocalToDb(
  supabase: SupabaseClient,
  localIds: string[]
): Promise<{ migrated: number; error: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { migrated: 0, error: true };

  if (localIds.length === 0) return { migrated: 0, error: false };

  const existing = await fetchDbFavorites(supabase);
  const existingSet = new Set(existing);
  const toInsert = [...new Set(localIds)].filter((id) => !existingSet.has(id));

  if (toInsert.length === 0) return { migrated: 0, error: false };

  const rows = toInsert.map((id) => ({ user_id: user.id, publicacion_id: id }));

  const chunks: typeof rows[] = [];
  for (let i = 0; i < rows.length; i += 50) {
    chunks.push(rows.slice(i, i + 50));
  }

  let totalMigrated = 0;
  let hadError = false;

  for (const chunk of chunks) {
    const { error } = await supabase
      .from("favoritos")
      .upsert(chunk, { onConflict: "user_id,publicacion_id" });
    if (error) {
      hadError = true;
    } else {
      totalMigrated += chunk.length;
    }
  }

  return { migrated: totalMigrated, error: hadError };
}
