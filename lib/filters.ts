export interface Filtros {
  dep?: string;
  servicios: string[];
  atiende_en: string[];
  edad_min: number;
  edad_max: number;
  tar_min: number;
  tar_max: number;
  alt_min: number;
  alt_max: number;
}

export const DEFAULTS: Filtros = {
  servicios: [],
  atiende_en: [],
  edad_min: 18,
  edad_max: 56,
  tar_min: 800,
  tar_max: 10000,
  alt_min: 140,
  alt_max: 184,
};

export const DEPARTAMENTOS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
  "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
  "Paysandu", "Rio Negro", "Rivera", "Rocha", "Salto",
  "San Jose", "Soriano", "Tacuarembo", "Treinta y Tres",
];

export const ATIENDE_EN_OPTIONS = ["Lugar propio", "Hotel", "Domicilio"];

export function parseSearchParams(searchParams: Record<string, string | string[] | undefined>): Filtros {
  const getStr = (key: string): string | undefined => {
    const v = searchParams[key];
    if (Array.isArray(v)) return v[0];
    return v || undefined;
  };

  const getArr = (key: string): string[] => {
    const v = searchParams[key];
    if (Array.isArray(v)) return v.filter(Boolean);
    if (v) return [v];
    return [];
  };

  const getNum = (key: string, def: number): number => {
    const v = getStr(key);
    if (!v) return def;
    const n = parseInt(v, 10);
    return isNaN(n) ? def : n;
  };

  return {
    dep: getStr("dep"),
    servicios: getArr("serv"),
    atiende_en: getArr("at_en"),
    edad_min: getNum("edad_min", DEFAULTS.edad_min),
    edad_max: getNum("edad_max", DEFAULTS.edad_max),
    tar_min: getNum("tar_min", DEFAULTS.tar_min),
    tar_max: getNum("tar_max", DEFAULTS.tar_max),
    alt_min: getNum("alt_min", DEFAULTS.alt_min),
    alt_max: getNum("alt_max", DEFAULTS.alt_max),
  };
}

export function buildSearchParams(filtros: Filtros): string {
  const params = new URLSearchParams();

  if (filtros.dep) params.set("dep", filtros.dep);
  filtros.servicios.forEach((s) => params.append("serv", s));
  filtros.atiende_en.forEach((a) => params.append("at_en", a));

  if (filtros.edad_min !== DEFAULTS.edad_min) params.set("edad_min", String(filtros.edad_min));
  if (filtros.edad_max !== DEFAULTS.edad_max) params.set("edad_max", String(filtros.edad_max));
  if (filtros.tar_min !== DEFAULTS.tar_min) params.set("tar_min", String(filtros.tar_min));
  if (filtros.tar_max !== DEFAULTS.tar_max) params.set("tar_max", String(filtros.tar_max));
  if (filtros.alt_min !== DEFAULTS.alt_min) params.set("alt_min", String(filtros.alt_min));
  if (filtros.alt_max !== DEFAULTS.alt_max) params.set("alt_max", String(filtros.alt_max));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function hasActiveFilters(filtros: Filtros): boolean {
  return !!(
    filtros.dep ||
    filtros.servicios.length > 0 ||
    filtros.atiende_en.length > 0 ||
    filtros.edad_min !== DEFAULTS.edad_min ||
    filtros.edad_max !== DEFAULTS.edad_max ||
    filtros.tar_min !== DEFAULTS.tar_min ||
    filtros.tar_max !== DEFAULTS.tar_max ||
    filtros.alt_min !== DEFAULTS.alt_min ||
    filtros.alt_max !== DEFAULTS.alt_max
  );
}
