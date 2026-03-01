import { NextRequest, NextResponse } from "next/server";
import { fetchPublicaciones } from "@/lib/queryPublicaciones";
import { parseSearchParams } from "@/lib/filters";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const categoria = (sp.get("categoria") || "mujer") as "mujer" | "hombre" | "trans";
  const offset = Math.max(0, parseInt(sp.get("offset") || "0", 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "12", 10) || 12));

  const filtroParams: Record<string, string | string[] | undefined> = {};
  for (const key of ["dep", "edad_min", "edad_max", "tar_min", "tar_max", "alt_min", "alt_max"]) {
    const v = sp.get(key);
    if (v) filtroParams[key] = v;
  }
  const servAll = sp.getAll("serv");
  if (servAll.length > 0) filtroParams["serv"] = servAll;
  const atAll = sp.getAll("at_en");
  if (atAll.length > 0) filtroParams["at_en"] = atAll;

  const filtros = parseSearchParams(filtroParams);

  const extra: { departamento?: string; zona?: string; ciudad?: string; servicio_especifico?: string } = {};
  const dep = sp.get("extra_dep");
  if (dep) extra.departamento = dep;
  const zona = sp.get("extra_zona");
  if (zona) extra.zona = zona;
  const ciudad = sp.get("extra_ciudad");
  if (ciudad) extra.ciudad = ciudad;
  const servEsp = sp.get("extra_servicio");
  if (servEsp) extra.servicio_especifico = servEsp;

  const result = await fetchPublicaciones(
    categoria,
    filtros,
    Object.keys(extra).length > 0 ? extra : undefined,
    { limit, offset }
  );

  if (result.error) {
    return NextResponse.json({ items: [], count: 0, hasMore: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ items: result.items, total: result.total, hasMore: result.hasMore });
}
