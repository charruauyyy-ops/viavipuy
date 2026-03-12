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
    "union",
    "paso-molino",
    "piedras-blancas",
    "prado"
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
    "/escorts-virtuales"
  ];

  const staticPages = urls.map((url) => ({
    url: `${base}${url}`,
    lastModified: new Date(),
  }));

  const zonasPages = zonas.map((zona) => ({
    url: `${base}/mujeres/${zona}`,
    lastModified: new Date(),
  }));

  return [...staticPages, ...zonasPages];
}
