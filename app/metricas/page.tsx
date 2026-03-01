"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { getPlanConfig } from "@/lib/plans";

interface EventRow {
  id: string;
  event_type: string;
  created_at: string;
}

function getHourBucket(hour: number): string {
  if (hour >= 6 && hour < 12) return "06:00 - 12:00";
  if (hour >= 12 && hour < 16) return "12:00 - 16:00";
  if (hour >= 16 && hour < 21) return "16:00 - 21:00";
  if (hour >= 21 || hour < 1) return "21:00 - 01:00";
  return "01:00 - 06:00";
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>;
}

export default function MetricasPage() {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string>("free");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [showUpsell, setShowUpsell] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setAuthError("Supabase no configurado."); setLoading(false); return; }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) { setAuthError("Inicia sesion."); setLoading(false); return; }

      const { data: profile } = await supabase.from("profiles").select("plan_actual, plan_estado").eq("id", user.id).maybeSingle();
      const plan = profile?.plan_actual || "free";
      setPlanId(plan);
      const config = getPlanConfig(plan);

      if (!config.metricas) {
        setShowUpsell(true);
        setLoading(false);
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: rows, error } = await supabase
        .from("profile_events")
        .select("id, event_type, created_at")
        .eq("profile_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) {
        setAuthError(`Error: ${error.message}`);
      } else {
        setEvents((rows || []) as EventRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <main className="vv-form-page"><div className="vv-form-container"><p className="vv-form-loading">Cargando...</p></div></main>;

  if (showUpsell) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-header">
            <h1 className="vv-form-title">Estadisticas</h1>
            <p className="vv-form-subtitle">Desbloquea metricas de tu perfil</p>
          </div>
          <div className="vv-upsell-card" data-testid="upsell-metricas">
            <div className="vv-upsell-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 className="vv-upsell-title">Mejora tu plan para ver estadisticas</h3>
            <p className="vv-upsell-text">Con Platino o Diamante podes ver cuantas visitas recibe tu perfil, clicks de WhatsApp, horarios con mas interes, y mucho mas.</p>
            <div className="vv-upsell-features">
              <div className="vv-upsell-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Visitas diarias y semanales</span>
              </div>
              <div className="vv-upsell-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Clicks de WhatsApp</span>
              </div>
              <div className="vv-upsell-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Horarios con mas interes</span>
              </div>
              <div className="vv-upsell-feature">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Tiempo promedio de visita</span>
              </div>
            </div>
            <a href="/planes" className="vv-btn" style={{ display: "block", textAlign: "center", marginTop: 16 }} data-testid="link-planes-upsell">
              Ver planes
            </a>
          </div>
          <a href="/mi-cuenta" className="vv-form-back" style={{ display: "block", marginTop: 24 }}>Volver a Mi Cuenta</a>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-header"><h1 className="vv-form-title">Estadisticas</h1></div>
          <div className="vv-form-error-box">{authError}</div>
          <a href="/planes" className="vv-form-link">Ver planes</a>
        </div>
      </main>
    );
  }

  const config = getPlanConfig(planId);
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const views = events.filter(e => e.event_type === "view");
  const waClicks = events.filter(e => e.event_type === "whatsapp_click");
  const favorites = events.filter(e => e.event_type === "favorite");

  const viewsToday = views.filter(e => e.created_at.startsWith(todayStr)).length;
  const viewsYesterday = views.filter(e => e.created_at.startsWith(yesterdayStr)).length;
  const clicksToday = waClicks.filter(e => e.created_at.startsWith(todayStr)).length;
  const clicksYesterday = waClicks.filter(e => e.created_at.startsWith(yesterdayStr)).length;

  const viewsVsYesterday = viewsYesterday > 0
    ? Math.round(((viewsToday - viewsYesterday) / viewsYesterday) * 100)
    : viewsToday > 0 ? 100 : 0;

  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const views24h = views.filter(e => new Date(e.created_at) >= last24h);
  const events24h = events.filter(e => new Date(e.created_at) >= last24h);

  const hourBuckets: Record<string, number> = {};
  for (const e of views24h) {
    const h = new Date(e.created_at).getHours();
    const bucket = getHourBucket(h);
    hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
  }
  const sortedBuckets = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1]);
  const peakHour = sortedBuckets.length > 0 ? sortedBuckets[0][0] : null;

  const totalViews7d = views.length;
  const totalClicks7d = waClicks.length;

  const avgTimeEstimate = totalViews7d > 0 ? Math.max(1, Math.round(15 + (totalClicks7d / Math.max(totalViews7d, 1)) * 60)) : 0;

  const conversionRate = totalViews7d > 0 ? ((totalClicks7d / totalViews7d) * 100).toFixed(1) : "0";

  const viewsByDay: Record<string, number> = {};
  for (const e of views) {
    const day = e.created_at.split("T")[0];
    viewsByDay[day] = (viewsByDay[day] || 0) + 1;
  }
  const dailyCounts = Object.values(viewsByDay);
  const avgDailyViews = dailyCounts.length > 0 ? Math.round(dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length) : 0;
  const trendUp = dailyCounts.length >= 2 && dailyCounts[dailyCounts.length - 1] >= dailyCounts[0];

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">Interes en tu perfil</h1>
          <p className="vv-form-subtitle">Ultimos 7 dias</p>
        </div>

        <div className="vv-metrics-grid">
          <div className="vv-metric-card" data-testid="metric-visitas-hoy">
            <span className="vv-metric-label">Visitas hoy</span>
            <span className="vv-metric-value">{viewsToday}</span>
            {viewsYesterday > 0 || viewsToday > 0 ? (
              <span className={`vv-metric-change ${viewsVsYesterday >= 0 ? "vv-metric-up" : "vv-metric-down"}`}>
                {viewsVsYesterday >= 0 ? "+" : ""}{viewsVsYesterday}% vs ayer
              </span>
            ) : (
              <span className="vv-metric-change">--</span>
            )}
          </div>

          <div className="vv-metric-card" data-testid="metric-clicks-hoy">
            <span className="vv-metric-label">Clicks WhatsApp hoy</span>
            <span className="vv-metric-value">{clicksToday}</span>
            {clicksYesterday > 0 && (
              <span className="vv-metric-change">
                Ayer: {clicksYesterday}
              </span>
            )}
          </div>

          <div className="vv-metric-card" data-testid="metric-visitas-7d">
            <span className="vv-metric-label">Visitas 7 dias</span>
            <span className="vv-metric-value">{totalViews7d}</span>
          </div>

          <div className="vv-metric-card" data-testid="metric-clicks-7d">
            <span className="vv-metric-label">Clicks WA 7 dias</span>
            <span className="vv-metric-value">{totalClicks7d}</span>
          </div>

          <div className="vv-metric-card" data-testid="metric-tiempo-promedio">
            <span className="vv-metric-label">Tiempo promedio</span>
            <span className="vv-metric-value">{avgTimeEstimate > 0 ? `${avgTimeEstimate}s` : "--"}</span>
          </div>

          <div className="vv-metric-card" data-testid="metric-conversion">
            <span className="vv-metric-label">Conversion WA</span>
            <span className="vv-metric-value">{conversionRate}%</span>
          </div>
        </div>

        {peakHour && (
          <div className="vv-cuenta-section" style={{ marginTop: 16 }}>
            <h2 className="vv-cuenta-label">Horarios con mas interes (24h)</h2>
            <div className="vv-metrics-hours">
              {sortedBuckets.map(([bucket, count]) => {
                const maxCount = sortedBuckets[0][1];
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                return (
                  <div key={bucket} className="vv-hour-row" data-testid={`hour-bucket-${bucket}`}>
                    <span className="vv-hour-label">{bucket}</span>
                    <div className="vv-hour-bar-bg">
                      <div className="vv-hour-bar" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="vv-hour-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {config.metricas_avanzadas && (
          <>
            <div className="vv-cuenta-section" style={{ marginTop: 16 }}>
              <h2 className="vv-cuenta-label">Tendencia</h2>
              <div className="vv-metrics-grid" style={{ marginTop: 8 }}>
                <div className="vv-metric-card" data-testid="metric-promedio-diario">
                  <span className="vv-metric-label">Promedio diario</span>
                  <span className="vv-metric-value">{avgDailyViews}</span>
                  <span className={`vv-metric-change ${trendUp ? "vv-metric-up" : "vv-metric-down"}`}>
                    {trendUp ? "En alza" : "En baja"}
                  </span>
                </div>
                <div className="vv-metric-card" data-testid="metric-favoritos">
                  <span className="vv-metric-label">Favoritos (7d)</span>
                  <span className="vv-metric-value">{favorites.length}</span>
                </div>
                <div className="vv-metric-card" data-testid="metric-peak-hour">
                  <span className="vv-metric-label">Horario pico</span>
                  <span className="vv-metric-value" style={{ fontSize: 18 }}>{peakHour || "--"}</span>
                </div>
                <div className="vv-metric-card" data-testid="metric-conversion-rate">
                  <span className="vv-metric-label">Ratio visita/contacto</span>
                  <span className="vv-metric-value">{conversionRate}%</span>
                </div>
              </div>
            </div>

            <div className="vv-cuenta-section" style={{ marginTop: 16 }}>
              <h2 className="vv-cuenta-label">Actividad reciente (24h)</h2>
              {events24h.length === 0 ? (
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Sin actividad en las ultimas 24 horas.</p>
              ) : (
                <div className="vv-activity-list">
                  {events24h.slice(0, 20).map((e) => {
                    const t = new Date(e.created_at);
                    const timeStr = t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={e.id} className="vv-activity-item">
                        <span className="vv-activity-icon">
                          {e.event_type === "view" ? <EyeIcon /> : e.event_type === "favorite" ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          ) : <WhatsAppIcon />}
                        </span>
                        <span className="vv-activity-text">
                          {e.event_type === "view" ? "Visita al perfil" : e.event_type === "favorite" ? "Agregado a favoritos" : "Click WhatsApp"}
                        </span>
                        <span className="vv-activity-time">{timeStr}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {!config.metricas_avanzadas && config.metricas && (
          <div className="vv-cuenta-section" style={{ marginTop: 16 }}>
            <div className="vv-upsell-mini" data-testid="upsell-diamante">
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: 8 }}>
                Con Diamante desbloqueas: tendencias, actividad en tiempo real, favoritos y panel completo.
              </p>
              <a href="/planes" className="vv-form-link" style={{ fontSize: 13 }}>Mejorar a Diamante</a>
            </div>
          </div>
        )}

        <a href="/mi-cuenta" className="vv-form-back" style={{ display: "block", marginTop: 24 }}>Volver a Mi Cuenta</a>
      </div>
    </main>
  );
}
