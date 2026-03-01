import { getServerSupabase } from "@/lib/supabaseServer";
import { PublicacionItem } from "@/lib/queryPublicaciones";

export async function getPublicacionesByZona(
  departamento: string,
  zona?: string,
  categoria: string = "mujer",
  search: string = ""
): Promise<{ items: PublicacionItem[]; count: number; error?: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { items: [], count: 0, error: "Error de configuración." };

  try {
    let query = supabase
      .from("publicaciones")
      .select("id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,updated_at")
      .eq("estado_publicacion", "activo")
      .eq("departamento", departamento)
      .eq("categoria", categoria);

    if (zona) {
      query = query.ilike("zona", `%${zona}%`);
    }

    if (search.trim()) {
      const q = search.trim();
      // Using or for multiple fields: nombre, zona, ciudad
      query = query.or(`nombre.ilike.%${q}%,zona.ilike.%${q}%,ciudad.ilike.%${q}%`);
    }

    const { data: pubs, error: pubError } = await query;

    if (pubError) return { items: [], count: 0, error: pubError.message };

    const pubList = (pubs || []) as PublicacionItem[];

    const planRank = (plan: any): number => {
      const p = (typeof plan === "string" ? plan : "").trim().toLowerCase();
      if (p === "diamante") return 1;
      if (p === "platino") return 2;
      if (p === "plus") return 3;
      if (p === "free" || p === "") return 4;
      return 5;
    };

    const sortPublicaciones = (publicaciones: any[]) => {
      return [...publicaciones].sort((a: any, b: any) => {
        const pr = planRank(a?.plan_actual) - planRank(b?.plan_actual);
        if (pr !== 0) return pr;

        const ad = a?.disponible ? 1 : 0;
        const bd = b?.disponible ? 1 : 0;
        if (ad !== bd) return bd - ad;

        const au = a?.ultima_actividad ?? null;
        const bu = b?.ultima_actividad ?? null;
        if (au === null && bu !== null) return 1;
        if (au !== null && bu === null) return -1;
        if (au !== null && bu !== null) {
          if (au < bu) return 1;
          if (au > bu) return -1;
        }

        const aa = a?.updated_at ?? "";
        const bb = b?.updated_at ?? "";
        if (aa < bb) return 1;
        if (aa > bb) return -1;

        return 0;
      });
    };

    const items = sortPublicaciones(pubList.map((p) => ({
      ...p,
      plan_actual: p.plan_actual || "free",
    })));

    return { items, count: items.length };
  } catch (err: unknown) {
    return { items: [], count: 0, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function getPublicacionesMVD() {
  return getPublicacionesByZona("Montevideo");
}

export async function getPublicacionesPDE() {
  return getPublicacionesByZona("Maldonado", "Punta del Este");
}
