import { getServerSupabase } from "@/lib/supabaseServer";

export interface PublicacionItem {
  id: string;
  nombre: string;
  edad: number;
  departamento: string;
  zona: string;
  cover_url: string;
  fotos: string[];
  fotos_preview: string[];
  video_preview_url: string | null;
  rating: number;
  disponible: boolean;
  disponible_manual?: boolean;
  ultima_actividad: string | null;
  tarifa_hora: number;
  altura_cm: number;
  servicios: string[];
  atiende_en: string[];
  user_id: string;
  plan_actual: string;
  plan_weight?: number;
  updated_at: string;
  created_at: string;
  precio?: number;
  mostrar_precio?: boolean;
  categoria: string;
  expires_at?: string;
  verification_status?: string;
}

interface FilterObject {
  minEdad?: number;
  maxEdad?: number;
  minTarifa?: number;
  maxTarifa?: number;
  disponible?: boolean;
  departamento?: string;
  ciudad?: string;
  zona?: string;
  servicios?: string[];
  atiendeEn?: string[];
  verificadas?: boolean;
}

export async function fetchPublicaciones(
  categoria: string,
  filtros?: FilterObject,
  extras?: { departamento?: string; ciudad?: string; zona?: string }
): Promise<{ items: PublicacionItem[]; count: number; error?: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { items: [], count: 0, error: "Error de configuración." };
  }

  try {
    const departamento = extras?.departamento || filtros?.departamento;
    const ciudad = extras?.ciudad || filtros?.ciudad;
    const zona = extras?.zona || filtros?.zona;
    const servicios = filtros?.servicios || [];
    const atiendeEn = filtros?.atiendeEn || [];
    const minEdad = filtros?.minEdad;
    const maxEdad = filtros?.maxEdad;
    const minTarifa = filtros?.minTarifa;
    const maxTarifa = filtros?.maxTarifa;
    const verificadas = filtros?.verificadas;
    const disponible = filtros?.disponible;

    // PARCHE QUIRURGICO: Detectar si es LISTADO BASE DE MUJERES
    const isBaseMujeres =
      categoria === "mujer" &&
      !departamento &&
      !ciudad &&
      !zona &&
      servicios.length === 0 &&
      !atiendeEn &&
      !minEdad &&
      !maxEdad &&
      !minTarifa &&
      !maxTarifa;

    let count = 0;

    // Si es listado base de mujeres, contar directo de la tabla
    if (isBaseMujeres) {
      const { count: realCount, error: countError } = await supabase
        .from("publicaciones")
        .select("*", { count: "exact", head: true })
        .eq("categoria", "mujer")
        .eq("estado_publicacion", "activo");

      if (countError) {
        return { items: [], count: 0, error: countError.message };
      }
      count = realCount || 0;
    } else {
      // Para otros casos, usar el conteo estándar (se obtendrá del resultado de la query)
      count = 0; // Se actualizará después
    }

    // Listado de items - usar query directa (no RPC)
    let query = supabase
      .from("publicaciones")
      .select(
        "id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,disponible_manual,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,plan_weight,updated_at,created_at,precio,mostrar_precio,categoria,expires_at,verification_status"
      )
      .eq("estado_publicacion", "activo")
      .eq("categoria", categoria);

    if (disponible !== undefined) {
      query = query.eq("disponible_manual", disponible);
    }

    if (minEdad !== undefined) {
      query = query.gte("edad", minEdad);
    }
    if (maxEdad !== undefined) {
      query = query.lte("edad", maxEdad);
    }

    if (minTarifa !== undefined) {
      query = query.gte("tarifa_hora", minTarifa);
    }
    if (maxTarifa !== undefined) {
      query = query.lte("tarifa_hora", maxTarifa);
    }

    if (departamento) {
      query = query.or(`departamento.eq.${departamento},ciudad.eq.${departamento}`);
    }

    if (ciudad) {
      query = query.eq("ciudad", ciudad);
    }

    if (zona) {
      query = query.ilike("zona", `%${zona}%`);
    }

    if (servicios.length > 0) {
      query = query.contains("servicios", servicios);
    }

    if (atiendeEn && atiendeEn.length > 0) {
      query = query.contains("atiende_en", atiendeEn);
    }

    if (verificadas) {
      query = query.eq("verification_status", "verified");
    }

    query = query.order("plan_weight", { ascending: false, nullsFirst: false });
    query = query.order("updated_at", { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      return { items: [], count: 0, error: error.message };
    }

    const items = ((data || []) as any[]).map((p) => ({
      ...p,
      plan_actual: p.plan_actual || "free",
    })) as PublicacionItem[];

    // Si NO era listado base, actualizar count desde los datos
    if (!isBaseMujeres) {
      count = items.length;
    }

    return { items, count };
  } catch (err: unknown) {
    return {
      items: [],
      count: 0,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  }
}

export async function fetchPublicacionMeta(
  id: string
): Promise<PublicacionItem | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("publicaciones")
      .select("nombre,ciudad,verification_status")
      .eq("id", id)
      .single();

    return error ? null : (data as PublicacionItem);
  } catch {
    return null;
  }
}

export async function fetchZonasConteo(
  categoria: string
): Promise<
  Array<{ zona_slug: string; zona_display: string; total: number }>
> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("publicaciones")
      .select("zona")
      .eq("estado_publicacion", "activo")
      .eq("categoria", categoria);

    if (error || !data) return [];

    const zonaMap = new Map<string, number>();
    (data as any[]).forEach((pub) => {
      const zona = pub.zona || "";
      zonaMap.set(zona, (zonaMap.get(zona) || 0) + 1);
    });

    return Array.from(zonaMap.entries())
      .map(([zona, total]) => ({
        zona_slug: zona
          .toLowerCase()
          .replace(/\s+/g, "-")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
        zona_display: zona,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  } catch {
    return [];
  }
}
