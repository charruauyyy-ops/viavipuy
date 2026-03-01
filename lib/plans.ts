export interface PlanConfig {
  id: string;
  name: string;
  color: string;
  badge_bg: string;
  badge_text: string;
  max_fotos: number | null;
  max_videos: number;
  metricas: boolean;
  metricas_avanzadas: boolean;
  ranking_priority: number;
  price_monthly: number;
  trial_days?: number;
  features: string[];
}

export const PLAN_PRICES: Record<string, Record<number, number>> = {
  plus:     { 7: 230,  30: 435,  90: 1105 },
  platino:  { 7: 430,  30: 835,  90: 2115 },
  diamante: { 7: 730,  30: 1435, 90: 3635 },
};

export function getPlanPrice(planId: string, days: number): number {
  return PLAN_PRICES[planId]?.[days] ?? 0;
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    color: "#888",
    badge_bg: "rgba(255,255,255,0.08)",
    badge_text: "#999",
    max_fotos: 3,
    max_videos: 0,
    metricas: false,
    metricas_avanzadas: false,
    ranking_priority: 0,
    price_monthly: 0,
    trial_days: 7,
    features: [
      "7 dias gratis",
      "Maximo 3 fotos",
      "Sin videos",
      "Sin metricas",
      "Visibilidad baja",
      "Al vencer se pausa el perfil",
    ],
  },

  plus: {
    id: "plus",
    name: "Plus",
    color: "#c6a75e",
    badge_bg: "linear-gradient(135deg, #c6a75e 0%, #a8893f 100%)",
    badge_text: "#fff",
    max_fotos: 8,
    max_videos: 1,
    metricas: true, // ✅ ACTIVADO
    metricas_avanzadas: false, // ✅ solo básicas
    ranking_priority: 1,
    price_monthly: 990,
    features: [
      "Hasta 8 fotos",
      "1 video",
      "Aparece en listados normales",
      "Badge Plus",
      "Visibilidad mejorada",
      "Metricas basicas de visitas y clicks",
    ],
  },

  platino: {
    id: "platino",
    name: "Platino",
    color: "#e0d5b7",
    badge_bg: "linear-gradient(135deg, #e0d5b7 0%, #c6a75e 100%)",
    badge_text: "#1a1a1a",
    max_fotos: 15,
    max_videos: 3,
    metricas: true,
    metricas_avanzadas: false,
    ranking_priority: 2,
    price_monthly: 1990,
    features: [
      "Hasta 15 fotos",
      "3 videos",
      "Boost en ranking",
      "Badge Platino",
      "Metricas basicas: visitas y clicks",
    ],
  },

  diamante: {
    id: "diamante",
    name: "Diamante",
    color: "#ffd700",
    badge_bg: "linear-gradient(135deg, #ffd700 0%, #c6a75e 100%)",
    badge_text: "#1a1a1a",
    max_fotos: null,
    max_videos: 999,
    metricas: true,
    metricas_avanzadas: true,
    ranking_priority: 3,
    price_monthly: 3990,
    features: [
      "Fotos ilimitadas",
      "Videos ilimitados",
      "Maxima prioridad en ranking",
      "Badge Diamante premium",
      "Panel completo de metricas",
      "Visitas, clicks, favoritos, tendencia",
      "Historias 24h en Destacadas",
    ],
  },
};

export const PLAN_ORDER = ["free", "plus", "platino", "diamante"];

export function getPlanConfig(planId: string | null | undefined): PlanConfig {
  return PLANS[planId || "free"] || PLANS.free;
}

export function getPlanRankingPriority(
  planId: string | null | undefined,
): number {
  return getPlanConfig(planId).ranking_priority;
}
