"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

interface Metrics {
  totalProfiles: number;
  totalPubs: number;
  pubsActivas: number;
  pubsSuspendidas: number;
  verifPendiente: number;
  verifEnRevision: number;
  verifAprobado: number;
  verifRechazado: number;
  planFree: number;
  planPlus: number;
  planPlatino: number;
  planDiamante: number;
  profilesSuspended: number;
  admins: number;
}

const emptyMetrics: Metrics = {
  totalProfiles: 0, totalPubs: 0, pubsActivas: 0, pubsSuspendidas: 0,
  verifPendiente: 0, verifEnRevision: 0, verifAprobado: 0, verifRechazado: 0,
  planFree: 0, planPlus: 0, planPlatino: 0, planDiamante: 0,
  profilesSuspended: 0, admins: 0,
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) { setAuthError("Supabase no configurado."); setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace("/"); return; }

      const m = { ...emptyMetrics };

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, plan_actual, verification_status, is_suspended, is_admin");

      if (profiles) {
        m.totalProfiles = profiles.length;
        profiles.forEach((p: Record<string, unknown>) => {
          const plan = (p.plan_actual as string) || "free";
          if (plan === "plus") m.planPlus++;
          else if (plan === "platino") m.planPlatino++;
          else if (plan === "diamante") m.planDiamante++;
          else m.planFree++;

          const verif = (p.verification_status as string) || "pending";
          if (verif === "approved") m.verifAprobado++;
          else if (verif === "rejected") m.verifRechazado++;
          else if (verif === "in_review") m.verifEnRevision++;
          else m.verifPendiente++;

          if (p.is_suspended) m.profilesSuspended++;
          if (p.is_admin) m.admins++;
        });
      }

      const { data: pubs } = await supabase
        .from("publicaciones")
        .select("id, disponible");

      if (pubs) {
        m.totalPubs = pubs.length;
        pubs.forEach((pub: Record<string, unknown>) => {
          if (pub.disponible !== false) m.pubsActivas++;
          else m.pubsSuspendidas++;
        });
      }

      setMetrics(m);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid rgba(198, 167, 94, 0.2)", borderTop: "3px solid var(--gold, #c6a75e)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff6b6b", fontSize: "16px" }}>
        {authError}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary, #0a0a0a)", color: "var(--text-primary, #ffffff)", fontFamily: "inherit" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 20px" }}>
        <div style={{ marginBottom: "32px" }}>
          <Link href="/admin" data-testid="link-back-admin" style={{ color: "var(--gold, #c6a75e)", textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
            Panel Admin
          </Link>
        </div>

        <h1 data-testid="text-dashboard-title" style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", letterSpacing: "0.3px" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary, #999999)", fontSize: "15px", marginBottom: "40px" }}>
          Resumen general de VIAVIP
        </p>

        {/* Top row: big numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px", marginBottom: "32px" }}>
          <StatCard label="Perfiles" value={metrics.totalProfiles} color="#60a5fa" testId="stat-profiles" />
          <StatCard label="Publicaciones" value={metrics.totalPubs} color="#c6a75e" testId="stat-pubs" />
          <StatCard label="Admins" value={metrics.admins} color="#a78bfa" testId="stat-admins" />
          <StatCard label="Suspendidos" value={metrics.profilesSuspended} color="#f87171" testId="stat-suspended" />
        </div>

        {/* Publicaciones breakdown */}
        <SectionTitle title="Publicaciones" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "14px", marginBottom: "32px" }}>
          <StatCard label="Activas" value={metrics.pubsActivas} color="#22c55e" testId="stat-pubs-activas" />
          <StatCard label="Suspendidas" value={metrics.pubsSuspendidas} color="#f87171" testId="stat-pubs-suspendidas" />
        </div>

        {/* Verification */}
        <SectionTitle title="Verificaciones" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "14px", marginBottom: "32px" }}>
          <StatCard label="Pendiente" value={metrics.verifPendiente} color="#94a3b8" testId="stat-verif-pendiente" />
          <StatCard label="En revision" value={metrics.verifEnRevision} color="#fbbf24" testId="stat-verif-revision" />
          <StatCard label="Aprobado" value={metrics.verifAprobado} color="#22c55e" testId="stat-verif-aprobado" />
          <StatCard label="Rechazado" value={metrics.verifRechazado} color="#f87171" testId="stat-verif-rechazado" />
        </div>

        {/* Plans */}
        <SectionTitle title="Planes" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "14px", marginBottom: "32px" }}>
          <StatCard label="Free" value={metrics.planFree} color="#94a3b8" testId="stat-plan-free" />
          <StatCard label="Plus" value={metrics.planPlus} color="#c6a75e" testId="stat-plan-plus" />
          <StatCard label="Platino" value={metrics.planPlatino} color="#e0d5b7" testId="stat-plan-platino" />
          <StatCard label="Diamante" value={metrics.planDiamante} color="#60a5fa" testId="stat-plan-diamante" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-tertiary, #666666)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "14px" }}>
      {title}
    </h2>
  );
}

function StatCard({ label, value, color, testId }: { label: string; value: number; color: string; testId: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        background: "var(--bg-card, #141414)",
        border: "1px solid var(--border, #1e1e1e)",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "32px", fontWeight: 700, color, letterSpacing: "-1px", marginBottom: "6px" }}>
        {value}
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-secondary, #999999)" }}>{label}</div>
    </div>
  );
}
