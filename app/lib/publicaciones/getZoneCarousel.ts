import { getServerSupabase } from "@/lib/supabaseServer";
import { PublicacionItem } from "@/lib/queryPublicaciones";

export async function getZoneCarousel(zone: 'mvd' | 'pde' | 'virtual', categoria?: string): Promise<PublicacionItem[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("publicaciones")
      .select("id, nombre, fotos_preview, cover_url, fotos, created_at, plan_actual, categoria")
      .eq("estado_publicacion", "activo");

    if (zone === 'mvd') {
      query = query.or("departamento.eq.Montevideo,ciudad.eq.Montevideo");
    } else if (zone === 'pde') {
      query = query.or("departamento.eq.Maldonado,ciudad.eq.Maldonado");
    } else if (zone === 'virtual') {
      query = query.contains("servicios", ["Virtual"])
        .gt("expires_at", new Date().toISOString());
      if (categoria) {
        query = query.eq("categoria", categoria);
      }
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(12);

    if (error || !data) return [];
    return data as PublicacionItem[];
  } catch (e) {
    console.error(`Error fetching carousel for ${zone}:`, e);
    return [];
  }
}
