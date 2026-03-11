import { getServerSupabase } from "@/lib/supabaseServer";
import { PublicacionItem } from "@/lib/queryPublicaciones";

export async function getFilteredPublicaciones(
  type: "disponibles" | "nuevas" | "virtual",
): Promise<{ items: PublicacionItem[]; count: number; error?: string }> {
  const supabase = await getServerSupabase();
  if (!supabase)
    return { items: [], count: 0, error: "Error de configuración." };

  try {
    // Ventana “Disponible ahora”
    const now = new Date();
    const windowMinutes = 30;
    const sinceIso = new Date(
      now.getTime() - windowMinutes * 60 * 1000,
    ).toISOString();

    let query = supabase
      .from("publicaciones")
      .select(
        [
          "id",
          "nombre",
          "edad",
          "departamento",
          "zona",
          "cover_url",
          "fotos",
          "fotos_preview",
          "video_preview_url",
          "rating",
          "disponible",
          "disponible_manual",
          "ultima_actividad",
          "tarifa_hora",
          "altura_cm",
          "servicios",
          "atiende_en",
          "user_id",
          "plan_actual",
          "plan_weight",
          "updated_at",
          "created_at",
          "precio",
          "mostrar_precio",
          "categoria",
          "expires_at",
        ].join(","),
      )
      .eq("estado_publicacion", "activo");

    if (type === "disponibles") {
      // ✅ Fuente de verdad: botón + actividad reciente
      query = query
        .eq("disponible_manual", true)
        .gte("ultima_actividad", sinceIso)
        .order("plan_weight", { ascending: false, nullsFirst: false })
        .order("ultima_actividad", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false });
    } else if (type === "nuevas") {
      const sevenDaysAgo = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      query = query
        .eq("categoria", "mujer")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false, nullsFirst: false });
    } else if (type === "virtual") {
      query = query
        .contains("servicios", ["Virtual"])
        .gt("expires_at", now.toISOString())
        .order("plan_weight", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false, nullsFirst: false });
    }

    const { data, error } = await query;
    if (error) return { items: [], count: 0, error: error.message };

    const items = ((data || []) as any[]).map((p) => ({
      ...p,
      plan_actual: p.plan_actual || "free",
    })) as PublicacionItem[];

    return { items, count: items.length };
  } catch (err: unknown) {
    return {
      items: [],
      count: 0,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}
