"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

const navCards = [
  {
    title: "Dashboard",
    description: "Metricas y resumen general del sistema",
    href: "/admin/dashboard",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    title: "Verificaciones",
    description: "Revisar y aprobar solicitudes de verificacion",
    href: "/admin/verificaciones",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
      </svg>
    ),
  },
  {
    title: "Publicaciones",
    description: "Gestionar publicaciones de usuarios",
    href: "/admin/publicaciones",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16v16H4z" />
        <path d="M4 9h16" />
        <path d="M9 4v16" />
      </svg>
    ),
  },
  {
    title: "Perfiles",
    description: "Administrar perfiles de usuarios",
    href: "/admin/perfiles",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Denuncias",
    description: "Bloquear y gestionar perfiles denunciados",
    href: "/admin/denuncias",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: "Pagos",
    description: "Aprobar y gestionar pagos de planes",
    href: "/admin/pagos",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    title: "Auditoria",
    description: "Registro de actividad y eventos del sistema",
    href: "/admin/auditoria",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = getSupabase();
      if (!supabase) {
        setAuthError("Supabase no configurado.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, rol")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }

      setLoading(false);
    }

    checkAdmin();
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
        <h1 data-testid="text-admin-title" style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", letterSpacing: "0.3px" }}>
          Panel Admin
        </h1>
        <p style={{ color: "var(--text-secondary, #999999)", fontSize: "15px", marginBottom: "40px" }}>
          Gestion y administracion de VIAVIP
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
          {navCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              data-testid={`link-admin-${card.title.toLowerCase()}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: "var(--bg-card, #141414)",
                  border: "1px solid var(--border, #1e1e1e)",
                  borderRadius: "10px",
                  padding: "28px 24px",
                  transition: "border-color 0.2s, background 0.2s",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold, #c6a75e)";
                  e.currentTarget.style.background = "var(--bg-elevated, #1a1a1a)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border, #1e1e1e)";
                  e.currentTarget.style.background = "var(--bg-card, #141414)";
                }}
              >
                <div style={{ color: "var(--gold, #c6a75e)" }}>{card.icon}</div>
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: 600, marginBottom: "6px" }}>{card.title}</h2>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary, #999999)", margin: 0, lineHeight: 1.5 }}>{card.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
