import { getSupabasePublicClient } from "@/lib/supabasePublic";
import { getPlanConfig } from "@/lib/plans";
import ListadoGrid from "./ListadoGrid";

interface Publicacion {
  id: string | number;
  nombre?: string;
  edad?: number;
  zona?: string;
  ciudad?: string;
  cover_url?: string;
  disponible?: boolean;
  rating?: number;
  created_at?: string;
  user_id?: string;
  plan_actual?: string;
}

interface ListadoPageProps {
  title: string;
  categoria: "mujer" | "hombre" | "trans";
  basePath: string;
}

export default async function ListadoPage({ title, categoria, basePath }: ListadoPageProps) {
  const supabase = getSupabasePublicClient();
  if (!supabase) return <main><div className="vv-page-header"><h1 className="vv-page-title">{title}</h1></div><div className="vv-empty">Error de configuracion.</div></main>;

  let items: Publicacion[] = [];
  let errorMsg: string | null = null;

  try {
    const { data: pubs, error: pubError } = await supabase
      .from("publicaciones")
      .select("id, nombre, edad, zona, ciudad, cover_url, disponible, rating, created_at, user_id")
      .eq("categoria", categoria)
      .not("cover_url", "is", null)
      .neq("cover_url", "");

    if (pubError) {
      errorMsg = pubError.message;
    } else {
      const pubList = (pubs || []) as Publicacion[];
      const userIds = pubList.map((p) => p.user_id).filter(Boolean);
      let planMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, plan_actual, plan_estado").in("id", userIds);
        if (profiles) {
          for (const p of profiles) {
            planMap[p.id] = p.plan_estado === "activo" ? (p.plan_actual || "free") : "free";
          }
        }
      }
      items = pubList.map((p) => ({ ...p, plan_actual: p.user_id ? planMap[p.user_id] || "free" : "free" }));
      items.sort((a, b) => {
        const pa = getPlanConfig(a.plan_actual).ranking_priority;
        const pb = getPlanConfig(b.plan_actual).ranking_priority;
        if (pb !== pa) return pb - pa;
        const da = a.disponible !== false ? 1 : 0;
        const db = b.disponible !== false ? 1 : 0;
        if (db !== da) return db - da;
        return (b.rating || 0) - (a.rating || 0);
      });
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Error desconocido";
  }

  if (errorMsg) return <main><div className="vv-page-header"><h1 className="vv-page-title">{title}</h1></div><div className="vv-empty">Error: {errorMsg}</div></main>;
  if (items.length === 0) return <main><div className="vv-page-header"><h1 className="vv-page-title">{title}</h1></div><div className="vv-empty">No hay publicaciones aun.</div></main>;

  const serializedItems = items.map(({ created_at, user_id, ...rest }) => rest);

  return (
    <main>
      <div className="vv-page-header">
        <h1 className="vv-page-title">{title}</h1>
        <p className="vv-page-subtitle">{items.length} perfil{items.length !== 1 ? "es" : ""}</p>
      </div>
      <ListadoGrid items={serializedItems} basePath={basePath} />
    </main>
  );
}
