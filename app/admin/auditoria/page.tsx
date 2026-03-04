"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

interface Stats {
  trafico: { hoy: number; sieteDias: number; treintaDias: number; total: number };
  visitantes: { hoy: number; sieteDias: number; treintaDias: number };
  usuarios: { hoy: number; sieteDias: number; treintaDias: number; total: number };
  publicaciones: { hoy: number; sieteDias: number; treintaDias: number; activas: number; vencidas: number };
  planes: { hoy: number; sieteDias: number; treintaDias: number; activos: number };
  publicacionesPagas: { hoy: number; sieteDias: number; treintaDias: number };
  ingresos: { hoy: number; sieteDias: number; treintaDias: number; total: number };
  interaccion: { profileViews: number; whatsapp: number; planes: number; publicar: number };
  rankings: { zonas: { zona: string; count: number }[]; ciudades: { ciudad: string; count: number }[] };
  embudo: { visitantes: number; registros: number; publicaciones: number; pagos: number };
}

export default function AdminAuditoriaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error("Supabase no configurado");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/login"); return; }

        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        if (!profile?.is_admin) { router.replace("/"); return; }

        const now = new Date();
        const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sieteDias = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const treintaDias = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Helper for counts
const getCount = async (
  table: string,
  filter?: { gte?: string; lt?: string; eq?: [string, any]; tipo?: string }
) => {
  let query: any = supabase.from(table).select("*", { count: "exact", head: true });

  // Filtros simples y explícitos para evitar inferencias de tipos gigantes (bug TS: "excessively deep")
  if (filter?.gte) query = query.gte("created_at", filter.gte);
  if (filter?.lt) query = query.lt("expires_at", filter.lt);
  if (filter?.eq) query = query.eq(filter.eq[0], filter.eq[1]);
  if (filter?.tipo) query = query.eq("tipo", filter.tipo);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

        // Helper for sum
const getSum = async (
  table: string,
  column: string,
  filter?: { gte?: string; lt?: string; eq?: [string, any]; tipo?: string }
) => {
  let query: any = supabase.from(table).select(`sum:${column}.sum()`, { head: false });

  if (filter?.gte) query = query.gte("created_at", filter.gte);
  if (filter?.lt) query = query.lt("expires_at", filter.lt);
  if (filter?.eq) query = query.eq(filter.eq[0], filter.eq[1]);
  if (filter?.tipo) query = query.eq("tipo", filter.tipo);

  const { data, error } = await query;
  if (error) throw error;
  return data?.[0]?.sum || 0;
};

        // Helper for unique IPs (distinct is hard in Supabase client, we fetch and set)
        const getUniqueIps = async (gte: string) => {
          const { data } = await supabase.from("site_visits").select("ip").gte("created_at", gte);
          return new Set(data?.map(d => d.ip)).size;
        };

        const [
          traficoHoy, trafico7, trafico30, traficoTotal,
          visitantesHoy, visitantes7, visitantes30,
          usersHoy, users7, users30, usersTotal,
          pubHoy, pub7, pub30, pubActivas, pubVencidas,
          planesHoy, planes7, planes30, planesActivos,
          pagasHoy, pagas7, pagas30,
          ingHoy, ing7, ing30, ingTotal,
          intViews, intWA, intPlanes, intPub,
          embVisitantes, embReg, embPub, embPagos
        ] = await Promise.all([
          getCount("site_visits", { gte: hoy }), getCount("site_visits", { gte: sieteDias }), getCount("site_visits", { gte: treintaDias }), getCount("site_visits"),
          getUniqueIps(hoy), getUniqueIps(sieteDias), getUniqueIps(treintaDias),
          getCount("profiles", { gte: hoy }), getCount("profiles", { gte: sieteDias }), getCount("profiles", { gte: treintaDias }), getCount("profiles"),
          getCount("publicaciones", { gte: hoy }), getCount("publicaciones", { gte: sieteDias }), getCount("publicaciones", { gte: treintaDias }), getCount("publicaciones", { eq: ["estado_publicacion", "activo"] }), getCount("publicaciones", { lt: now.toISOString() }),
          getCount("pagos_viavip", { gte: hoy, eq: ["estado_pago", "acreditado"], tipo: "plan" }), getCount("pagos_viavip", { gte: sieteDias, eq: ["estado_pago", "acreditado"], tipo: "plan" }), getCount("pagos_viavip", { gte: treintaDias, eq: ["estado_pago", "acreditado"], tipo: "plan" }), getCount("profiles", { eq: ["plan_estado", "activo"] }),
          getCount("pagos_viavip", { gte: hoy, eq: ["estado_pago", "acreditado"], tipo: "publicacion" }), getCount("pagos_viavip", { gte: sieteDias, eq: ["estado_pago", "acreditado"], tipo: "publicacion" }), getCount("pagos_viavip", { gte: treintaDias, eq: ["estado_pago", "acreditado"], tipo: "publicacion" }),
          getSum("pagos_viavip", "monto", { gte: hoy, eq: ["estado_pago", "acreditado"] }), getSum("pagos_viavip", "monto", { gte: sieteDias, eq: ["estado_pago", "acreditado"] }), getSum("pagos_viavip", "monto", { gte: treintaDias, eq: ["estado_pago", "acreditado"] }), getSum("pagos_viavip", "monto", { eq: ["estado_pago", "acreditado"] }),
          getCount("profile_views"), getCount("whatsapp_clicks"), getCount("plan_clicks"), getCount("publish_clicks"),
          getCount("site_visits"), getCount("profiles"), getCount("publicaciones"), getCount("pagos_viavip", { eq: ["estado_pago", "acreditado"] })
        ]);

        const { data: zonasData } = await supabase.from("publicaciones").select("zona");
        const zonasCount = (zonasData || []).reduce((acc: any, curr: any) => {
          if (curr.zona) acc[curr.zona] = (acc[curr.zona] || 0) + 1;
          return acc;
        }, {});
        const sortedZonas = Object.entries(zonasCount).map(([zona, count]: [string, any]) => ({ zona, count })).sort((a, b) => b.count - a.count).slice(0, 10);

        const { data: ciudadesData } = await supabase.from("publicaciones").select("ciudad");
        const ciudadesCount = (ciudadesData || []).reduce((acc: any, curr: any) => {
          if (curr.ciudad) acc[curr.ciudad] = (acc[curr.ciudad] || 0) + 1;
          return acc;
        }, {});
        const sortedCiudades = Object.entries(ciudadesCount).map(([ciudad, count]: [string, any]) => ({ ciudad, count })).sort((a, b) => b.count - a.count).slice(0, 10);

        setStats({
          trafico: { hoy: traficoHoy, sieteDias: trafico7, treintaDias: trafico30, total: traficoTotal },
          visitantes: { hoy: visitantesHoy, sieteDias: visitantes7, treintaDias: visitantes30 },
          usuarios: { hoy: usersHoy, sieteDias: users7, treintaDias: users30, total: usersTotal },
          publicaciones: { hoy: pubHoy, sieteDias: pub7, treintaDias: pub30, activas: pubActivas, vencidas: pubVencidas },
          planes: { hoy: planesHoy, sieteDias: planes7, treintaDias: planes30, activos: planesActivos },
          publicacionesPagas: { hoy: pagasHoy, sieteDias: pagas7, treintaDias: pagas30 },
          ingresos: { hoy: ingHoy, sieteDias: ing7, treintaDias: ing30, total: ingTotal },
          interaccion: { profileViews: intViews, whatsapp: intWA, planes: intPlanes, publicar: intPub },
          rankings: { zonas: sortedZonas, ciudades: sortedCiudades },
          embudo: { visitantes: embVisitantes, registros: embReg, publicaciones: embPub, pagos: embPagos }
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid rgba(198,167,94,0.2)", borderTop: "3px solid #c6a75e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#ff6b6b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Error: {error}
      </div>
    );
  }

  const Section = ({ title, cards }: { title: string; cards: { label: string; value: string | number }[] }) => (
    <div style={{ marginBottom: "40px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#c6a75e", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "1px" }}>{title}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "13px", color: "#999", fontWeight: 500 }}>{c.label}</span>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#fff" }}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Link href="/admin" style={{ color: "#c6a75e", textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
              Panel Admin
            </Link>
            <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0 }}>Dashboard de Auditoría</h1>
          </div>
          <button onClick={() => window.location.reload()} style={{ background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}>Actualizar</button>
        </div>

        {stats && (
          <>
            <Section title="Tráfico" cards={[
              { label: "Visitas hoy", value: stats.trafico.hoy },
              { label: "Visitas 7 días", value: stats.trafico.sieteDias },
              { label: "Visitas 30 días", value: stats.trafico.treintaDias },
              { label: "Visitas totales", value: stats.trafico.total },
            ]} />

            <Section title="Visitantes Únicos" cards={[
              { label: "Únicos hoy", value: stats.visitantes.hoy },
              { label: "Únicos 7 días", value: stats.visitantes.sieteDias },
              { label: "Únicos 30 días", value: stats.visitantes.treintaDias },
            ]} />

            <Section title="Usuarios" cards={[
              { label: "Registros hoy", value: stats.usuarios.hoy },
              { label: "Registros 7 días", value: stats.usuarios.sieteDias },
              { label: "Registros 30 días", value: stats.usuarios.treintaDias },
              { label: "Usuarios totales", value: stats.usuarios.total },
            ]} />

            <Section title="Publicaciones" cards={[
              { label: "Publicaciones hoy", value: stats.publicaciones.hoy },
              { label: "Publicaciones 7 días", value: stats.publicaciones.sieteDias },
              { label: "Publicaciones 30 días", value: stats.publicaciones.treintaDias },
              { label: "Activas", value: stats.publicaciones.activas },
              { label: "Vencidas", value: stats.publicaciones.vencidas },
            ]} />

            <Section title="Planes" cards={[
              { label: "Planes hoy", value: stats.planes.hoy },
              { label: "Planes 7 días", value: stats.planes.sieteDias },
              { label: "Planes 30 días", value: stats.planes.treintaDias },
              { label: "Usuarios con plan", value: stats.planes.activos },
            ]} />

            <Section title="Publicaciones Pagas (Destacar)" cards={[
              { label: "Destacados hoy", value: stats.publicacionesPagas.hoy },
              { label: "Destacados 7 días", value: stats.publicacionesPagas.sieteDias },
              { label: "Destacados 30 días", value: stats.publicacionesPagas.treintaDias },
            ]} />

            <Section title="Ingresos (UYU)" cards={[
              { label: "Ingresos hoy", value: `$${stats.ingresos.hoy.toLocaleString()}` },
              { label: "Ingresos 7 días", value: `$${stats.ingresos.sieteDias.toLocaleString()}` },
              { label: "Ingresos 30 días", value: `$${stats.ingresos.treintaDias.toLocaleString()}` },
              { label: "Ingresos totales", value: `$${stats.ingresos.total.toLocaleString()}` },
            ]} />

            <Section title="Interacción" cards={[
              { label: "Vistas perfiles", value: stats.interaccion.profileViews },
              { label: "Clicks WhatsApp", value: stats.interaccion.whatsapp },
              { label: "Clicks en planes", value: stats.interaccion.planes },
              { label: "Clicks en publicar", value: stats.interaccion.publicar },
            ]} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "40px" }}>
              <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ color: "#c6a75e", fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>TOP 10 ZONAS</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {stats.rankings.zonas.map((z, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", borderBottom: "1px solid #1a1a1a", paddingBottom: "8px" }}>
                      <span>{z.zona}</span>
                      <span style={{ fontWeight: 600 }}>{z.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "24px" }}>
                <h3 style={{ color: "#c6a75e", fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>TOP 10 CIUDADES</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {stats.rankings.ciudades.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", borderBottom: "1px solid #1a1a1a", paddingBottom: "8px" }}>
                      <span>{c.ciudad}</span>
                      <span style={{ fontWeight: 600 }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: "#141414", border: "1px solid #1e1e1e", borderRadius: "12px", padding: "32px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#c6a75e", marginBottom: "24px" }}>EMBUDO DEL SITIO</h2>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                <div><div style={{ fontSize: "32px", fontWeight: 800 }}>{stats.embudo.visitantes}</div><div style={{ fontSize: "13px", color: "#999" }}>Visitantes</div></div>
                <div style={{ display: "flex", alignItems: "center", color: "#333" }}>→</div>
                <div><div style={{ fontSize: "32px", fontWeight: 800 }}>{stats.embudo.registros}</div><div style={{ fontSize: "13px", color: "#999" }}>Registros</div></div>
                <div style={{ display: "flex", alignItems: "center", color: "#333" }}>→</div>
                <div><div style={{ fontSize: "32px", fontWeight: 800 }}>{stats.embudo.publicaciones}</div><div style={{ fontSize: "13px", color: "#999" }}>Anuncios</div></div>
                <div style={{ display: "flex", alignItems: "center", color: "#333" }}>→</div>
                <div><div style={{ fontSize: "32px", fontWeight: 800 }}>{stats.embudo.pagos}</div><div style={{ fontSize: "13px", color: "#999" }}>Ventas</div></div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
// fix auditoria