import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://viavipuy.com";

  const zonas = [
    "centro",
    "pocitos",
    "cordon",
    "aguada",
    "tres-cruces",
    "buceo",
    "malvin",
    "la-union",
    "paso-molino",
    "piedras-blancas",
    "prado",
    "la-comercial",
    "parque-batlle",
    "maronas"
  ];

  const servicios = [
    "masajes",
    "gfe",
    "escort-vip",
    "sexo-oral",
    "sexo-anal",
    "duo",
    "trios",
    "servicio-vip",
    "virtual"
  ];

  const urls = [
    "/",
    "/mujeres",
    "/mvd",
    "/pde",
    "/escorts-uruguay",
    "/escorts-verificadas",
    "/escorts-nuevas",
    "/escorts-disponibles-ahora",
    "/escorts-virtuales",
    "/servicios"
  ];

  const staticPages = urls.map((url) => ({
    url: `${base}${url}`,
  }));

  const zonasPages = zonas.map((zona) => ({
    url: `${base}/mujeres/${zona}`,
  }));

  const serviciosPages = servicios.map((servicio) => ({
    url: `${base}/servicios/${servicio}`,
  }));

  return [
    ...staticPages,
    ...zonasPages,
    ...serviciosPages
  ];
}
