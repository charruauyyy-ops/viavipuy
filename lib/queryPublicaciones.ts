import { getSupabasePublicClient } from "@/lib/supabasePublic";
import { LOCATIONS } from "@/lib/locationsCatalog";
import { type Filtros, DEFAULTS } from "@/lib/filters";

export interface PublicacionItem {
  id: string | number;
  nombre?: string;
  edad?: number;
  departamento?: string;
  zona?: string;
  cover_url?: string;
  fotos?: string[];
  fotos_preview?: string[];
  video_preview_url?: string | null;
  rating?: number;
  disponible?: boolean;
  ultima_actividad?: string;
  tarifa_hora?: number;
  altura_cm?: number;
  servicios?: string[];
  atiende_en?: string[];
  user_id?: string;
  plan_actual?: string;
  updated_at?: string;
  precio?: number | null;
  mostrar_precio?: boolean;
}

export async function fetchPublicaciones(
  categoria: "mujer" | "hombre" | "trans",
  filtros: Filtros,
  extra?: { departamento?: string; zona?: string; ciudad?: string; servicio_especifico?: string },
  pagination?: { limit?: number; offset?: number }
): Promise<{ items: PublicacionItem[]; count: number; total: number; hasMore: boolean; error?: string }> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return { items: [], count: 0, total: 0, hasMore: false, error: "Error de configuracion." };

  try {
    const departamento = extra?.departamento || filtros.dep || null;
    const ciudad = extra?.ciudad || null;
    const zona = extra?.zona || null;

    const servicios: string[] = [...filtros.servicios];
    if (extra?.servicio_especifico && !servicios.includes(extra.servicio_especifico)) {
      servicios.push(extra.servicio_especifico);
    }

    const minEdad = filtros.edad_min;
    const maxEdad = filtros.edad_max;
    const minTarifa = filtros.tar_min > 0 ? filtros.tar_min : null;
    const maxTarifa = filtros.tar_max < 100000 ? filtros.tar_max : null;

    const limit = pagination?.limit ?? 200;
    const offset = pagination?.offset ?? 0;

    const atiendeEn = filtros.atiende_en.length === 1 ? filtros.atiende_en[0] : null;

    // When no pagination (e.g., /mujeres initial load), use direct query to get ALL items
    // When pagination exists (e.g., "Load More"), use RPC with limit/offset
    if (!pagination) {
      let query = supabase
        .from("publicaciones")
        .select("id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,plan_weight,updated_at,categoria,precio,mostrar_precio")
        .eq("estado_publicacion", "activo")
        .eq("categoria", categoria);

      if (departamento) query = query.eq("departamento", departamento);
      if (ciudad) query = query.eq("ciudad", ciudad);
      if (zona) query = query.eq("zona", zona);
      if (minEdad !== null) query = query.gte("edad", minEdad);
      if (maxEdad !== null) query = query.lte("edad", maxEdad);
      if (minTarifa !== null) query = query.gte("tarifa_hora", minTarifa);
      if (maxTarifa !== null) query = query.lte("tarifa_hora", maxTarifa);
      if (servicios.length > 0) query = query.contains("servicios", servicios);
      if (atiendeEn) query = query.contains("atiende_en", [atiendeEn]);

      const { data: allRows, error: dirError } = await query;

      if (dirError) {
        return { items: [], count: 0, total: 0, hasMore: false, error: dirError.message };
      }

      let items = (allRows || []) as PublicacionItem[];

      if (filtros.atiende_en.length > 1) {
        items = items.filter((p) => {
          const pa = p.atiende_en || [];
          return filtros.atiende_en.every((a) => pa.includes(a));
        });
      }

      const alturaFilterActive =
        filtros.alt_min !== DEFAULTS.alt_min || filtros.alt_max !== DEFAULTS.alt_max;
      if (alturaFilterActive) {
        items = items.filter((p) => {
          const h = p.altura_cm;
          if (h == null || h === 0) return false;
          return h >= filtros.alt_min && h <= filtros.alt_max;
        });
      }

      const total = items.length;
      return { items, count: total, total, hasMore: false };
    }

    // Paginated request: use RPC with limit/offset
    const rpcParams = {
      _categoria: categoria,
      _departamento: departamento,
      _ciudad: ciudad,
      _zona: zona,
      _min_edad: minEdad,
      _max_edad: maxEdad,
      _min_tarifa: minTarifa,
      _max_tarifa: maxTarifa,
      _servicios: servicios.length > 0 ? servicios : null,
      _atiende_en: atiendeEn,
      _limit: limit,
      _offset: offset,
    };

    const countParams = {
      _categoria: rpcParams._categoria,
      _departamento: rpcParams._departamento,
      _ciudad: rpcParams._ciudad,
      _zona: rpcParams._zona,
      _min_edad: rpcParams._min_edad,
      _max_edad: rpcParams._max_edad,
      _min_tarifa: rpcParams._min_tarifa,
      _max_tarifa: rpcParams._max_tarifa,
      _servicios: rpcParams._servicios,
      _atiende_en: rpcParams._atiende_en,
    };

    const [listRes, countRes] = await Promise.all([
      supabase.rpc("listar_publicaciones_categoria_filtrada", rpcParams),
      supabase.rpc("contar_publicaciones_categoria_filtrada", countParams),
    ]);

    if (listRes.error) {
      return { items: [], count: 0, total: 0, hasMore: false, error: listRes.error.message };
    }

    const rpcRows = (listRes.data || []) as any[];
    const rpcIds = rpcRows.map((r: any) => r.id).filter(Boolean);

    let items: PublicacionItem[] = [];
    if (rpcIds.length > 0) {
      const { data: fullRows } = await supabase
        .from("publicaciones")
        .select("id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,plan_weight,updated_at,categoria,precio,mostrar_precio")
        .in("id", rpcIds);

      const fullMap = new Map<string, any>();
      for (const row of fullRows || []) {
        fullMap.set(row.id, row);
      }

      items = rpcIds
        .map((id: string) => fullMap.get(id))
        .filter(Boolean)
        .map((p: any) => ({ ...p, plan_actual: p.plan_actual || "free" })) as PublicacionItem[];
    }

    if (filtros.atiende_en.length > 1) {
      items = items.filter((p) => {
        const pa = p.atiende_en || [];
        return filtros.atiende_en.every((a) => pa.includes(a));
      });
    }

    const alturaFilterActive =
      filtros.alt_min !== DEFAULTS.alt_min || filtros.alt_max !== DEFAULTS.alt_max;
    if (alturaFilterActive) {
      items = items.filter((p) => {
        const h = p.altura_cm;
        if (h == null || h === 0) return false;
        return h >= filtros.alt_min && h <= filtros.alt_max;
      });
    }

    const total = typeof countRes.data === "number" ? countRes.data : (countRes.data?.[0]?.count ?? items.length);
    const hasMore = offset + items.length < total;

    return { items, count: total, total, hasMore };
  } catch (err: unknown) {
    return { items: [], count: 0, total: 0, hasMore: false, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function fetchPublicacionesByZona(
  zona: string,
  categoria: "mujer" | "hombre" | "trans" = "mujer"
): Promise<{ items: PublicacionItem[]; count: number; error?: string }> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return { items: [], count: 0, error: "Error de configuracion." };

  try {
    const dbZona = zona.replaceAll("-", " ");

    const listRes = await supabase.rpc("listar_publicaciones_categoria_filtrada", {
      _categoria: categoria,
      _departamento: null,
      _ciudad: null,
      _zona: dbZona,
      _min_edad: null,
      _max_edad: null,
      _min_tarifa: null,
      _max_tarifa: null,
      _servicios: null,
      _limit: 200,
      _offset: 0,
    });

    if (listRes.error) {
      return { items: [], count: 0, error: listRes.error.message };
    }

    const rpcRows = (listRes.data || []) as any[];
    const rpcIds = rpcRows.map((r: any) => r.id).filter(Boolean);

    let items: PublicacionItem[] = [];
    if (rpcIds.length > 0) {
      const { data: fullRows } = await supabase
        .from("publicaciones")
        .select("id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,plan_weight,updated_at,categoria,precio,mostrar_precio")
        .in("id", rpcIds);

      const fullMap = new Map<string, any>();
      for (const row of fullRows || []) {
        fullMap.set(row.id, row);
      }

      items = rpcIds
        .map((id: string) => fullMap.get(id))
        .filter(Boolean)
        .map((p: any) => ({ ...p, plan_actual: p.plan_actual || "free" })) as PublicacionItem[];
    }

    return { items, count: items.length };
  } catch (err: unknown) {
    return { items: [], count: 0, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function fetchLocationCounts(
  categoria: string = "mujer"
): Promise<Record<string, number>> {
  const supabase = getSupabasePublicClient();
  const counts: Record<string, number> = {};
  for (const loc of LOCATIONS) counts[loc.slug] = 0;
  if (!supabase) return counts;

  try {
    const { data, error } = await supabase
      .from("publicaciones")
      .select("departamento,ciudad,zona")
      .eq("categoria", categoria)
      .eq("estado_publicacion", "activo");

    if (error || !data) return counts;

    const strip = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const catalogNorms = LOCATIONS.map((loc) => ({
      ...loc,
      norm: strip(loc.slug.replaceAll("-", " ")),
    }));

    for (const row of data) {
      const dep = strip(row.departamento || "");
      const ciudad = strip(row.ciudad || "");
      const zona = strip(row.zona || "");

      for (const cat of catalogNorms) {
        if (
          (cat.kind === "departamento" && dep === cat.norm) ||
          (cat.kind === "ciudad" && ciudad === cat.norm) ||
          (cat.kind === "zona" && zona === cat.norm)
        ) {
          counts[cat.slug]++;
        }
      }
    }

    return counts;
  } catch {
    return counts;
  }
}

export interface ZonaConteo {
  zona_slug: string;
  zona_display: string;
  total: number;
}

export async function fetchZonasConteo(
  categoria: "mujer" | "hombre" | "trans"
): Promise<ZonaConteo[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("listar_zonas_conteo", {
      _categoria: categoria,
    });
    if (error || !data) return [];
    return (data as ZonaConteo[]).filter((z) => z.total > 0);
  } catch {
    return [];
  }
}

export async function fetchPublicacionesPorZona(
  categoria: "mujer" | "hombre" | "trans",
  zonaSlug: string
): Promise<{ items: PublicacionItem[]; count: number; error?: string }> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return { items: [], count: 0, error: "Error de configuracion." };
  try {
    const { data, error } = await supabase.rpc("listar_publicaciones_por_zona", {
      _categoria: categoria,
      _zona_slug: zonaSlug,
    });
    if (error) return { items: [], count: 0, error: error.message };
    const rows = (data || []) as any[];
    const rpcIds = rows.map((r: any) => r.id).filter(Boolean);

    let items: PublicacionItem[] = [];
    if (rpcIds.length > 0) {
      const { data: fullRows } = await supabase
        .from("publicaciones")
        .select("id,nombre,edad,departamento,zona,cover_url,fotos,fotos_preview,video_preview_url,rating,disponible,ultima_actividad,tarifa_hora,altura_cm,servicios,atiende_en,user_id,plan_actual,plan_weight,updated_at,categoria,precio,mostrar_precio")
        .in("id", rpcIds);

      const fullMap = new Map<string, any>();
      for (const row of fullRows || []) {
        fullMap.set(row.id, row);
      }

      items = rpcIds
        .map((id: string) => fullMap.get(id))
        .filter(Boolean)
        .map((p: any) => ({ ...p, plan_actual: p.plan_actual || "free" })) as PublicacionItem[];
    }

    return { items, count: items.length };
  } catch (err: unknown) {
    return { items: [], count: 0, error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function fetchPublicacionMeta(id: string): Promise<{ nombre: string | null; ciudad: string | null; verification_status: string | null } | null> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("publicaciones")
    .select("nombre, ciudad, verification_status")
    .eq("id", id)
    .maybeSingle();
  return data || null;
}
