export type LocationKind = "departamento" | "ciudad" | "zona";

export type LocationItem = {
  label: string;
  slug: string;
  kind: LocationKind;
  featured?: boolean;
};

export const LOCATIONS: LocationItem[] = [
  { label: "Montevideo", slug: "montevideo", kind: "departamento", featured: true },
  { label: "Canelones", slug: "canelones", kind: "departamento" },
  { label: "Maldonado", slug: "maldonado", kind: "departamento", featured: true },
  { label: "Colonia", slug: "colonia", kind: "departamento" },
  { label: "San José", slug: "san-jose", kind: "departamento" },
  { label: "Flores", slug: "flores", kind: "departamento" },
  { label: "Florida", slug: "florida", kind: "departamento" },
  { label: "Lavalleja", slug: "lavalleja", kind: "departamento" },
  { label: "Rocha", slug: "rocha", kind: "departamento" },
  { label: "Treinta y Tres", slug: "treinta-y-tres", kind: "departamento" },
  { label: "Cerro Largo", slug: "cerro-largo", kind: "departamento" },
  { label: "Rivera", slug: "rivera", kind: "departamento" },
  { label: "Tacuarembó", slug: "tacuarembo", kind: "departamento" },
  { label: "Durazno", slug: "durazno", kind: "departamento" },
  { label: "Soriano", slug: "soriano", kind: "departamento" },
  { label: "Río Negro", slug: "rio-negro", kind: "departamento" },
  { label: "Paysandú", slug: "paysandu", kind: "departamento" },
  { label: "Salto", slug: "salto", kind: "departamento" },
  { label: "Artigas", slug: "artigas", kind: "departamento" },

  { label: "Punta del Este", slug: "punta-del-este", kind: "ciudad", featured: true },
  { label: "Piriápolis", slug: "piriapolis", kind: "ciudad" },
  { label: "San Carlos", slug: "san-carlos", kind: "ciudad" },
  { label: "La Paloma", slug: "la-paloma", kind: "ciudad" },
  { label: "La Pedrera", slug: "la-pedrera", kind: "ciudad" },
  { label: "Chuy", slug: "chuy", kind: "ciudad" },
  { label: "Atlántida", slug: "atlantida", kind: "ciudad" },
  { label: "Ciudad de la Costa", slug: "ciudad-de-la-costa", kind: "ciudad" },
  { label: "Solymar", slug: "solymar", kind: "ciudad" },
  { label: "Lagomar", slug: "lagomar", kind: "ciudad" },
  { label: "Shangrilá", slug: "shangrila", kind: "ciudad" },
  { label: "El Pinar", slug: "el-pinar", kind: "ciudad" },
  { label: "Parque del Plata", slug: "parque-del-plata", kind: "ciudad" },
  { label: "Las Toscas", slug: "las-toscas", kind: "ciudad" },
  { label: "Costa de Oro", slug: "costa-de-oro", kind: "ciudad" },

  { label: "Pocitos", slug: "pocitos", kind: "zona", featured: true },
  { label: "Punta Carretas", slug: "punta-carretas", kind: "zona", featured: true },
  { label: "Buceo", slug: "buceo", kind: "zona" },
  { label: "Carrasco", slug: "carrasco", kind: "zona" },
  { label: "Carrasco Norte", slug: "carrasco-norte", kind: "zona" },
  { label: "Malvín", slug: "malvin", kind: "zona" },
  { label: "Malvín Norte", slug: "malvin-norte", kind: "zona" },
  { label: "Punta Gorda", slug: "punta-gorda", kind: "zona" },
  { label: "Parque Rodó", slug: "parque-rodo", kind: "zona" },
  { label: "Cordón", slug: "cordon", kind: "zona", featured: true },
  { label: "Centro", slug: "centro", kind: "zona" },
  { label: "Ciudad Vieja", slug: "ciudad-vieja", kind: "zona" },
  { label: "Palermo", slug: "palermo", kind: "zona" },
  { label: "Barrio Sur", slug: "barrio-sur", kind: "zona" },
  { label: "Tres Cruces", slug: "tres-cruces", kind: "zona" },
  { label: "La Blanqueada", slug: "la-blanqueada", kind: "zona" },
  { label: "Parque Batlle", slug: "parque-batlle", kind: "zona" },
  { label: "Unión", slug: "union", kind: "zona" },
  { label: "Goes", slug: "goes", kind: "zona" },
  { label: "Aguada", slug: "aguada", kind: "zona" },
  { label: "La Comercial", slug: "la-comercial", kind: "zona" },
  { label: "Prado", slug: "prado", kind: "zona" },
  { label: "Cerro", slug: "cerro", kind: "zona" },
  { label: "Belvedere", slug: "belvedere", kind: "zona" },
  { label: "Sayago", slug: "sayago", kind: "zona" },
  { label: "Colón", slug: "colon", kind: "zona" },
  { label: "Paso Molino", slug: "paso-molino", kind: "zona" },
  { label: "Reducto", slug: "reducto", kind: "zona" },
  { label: "Jacinto Vera", slug: "jacinto-vera", kind: "zona" },
  { label: "Hipódromo", slug: "hipodromo", kind: "zona" },
  { label: "Maroñas", slug: "maronas", kind: "zona" },
  { label: "Cerrito", slug: "cerrito", kind: "zona" },

  { label: "Virtual", slug: "virtual", kind: "zona" },
];

export const FEATURED_LOCATIONS = LOCATIONS.filter((l) => l.featured);
