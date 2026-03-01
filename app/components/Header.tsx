"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

const MENU_ITEMS = [
  { label: "Mujeres", href: "/mujeres", icon: "woman" },
  { label: "Trans", href: "/trans", icon: "trans" },
  { label: "Hombres", href: "/hombres", icon: "man" },
  { label: "Disponibles ahora", href: "/disponibles", icon: "clock" },
  { label: "Nuevas", href: "/nuevas", icon: "sparkle" },
  { label: "Virtual", href: "/virtual", icon: "video" },
  { label: "Cerca de mi", href: "/cerca", icon: "pin" },
  { label: "Mi cuenta", href: "/mi-cuenta", icon: "user" },
];

function MenuIcon({ name }: { name: string }) {
  const s = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.5 };
  switch (name) {
    case "woman":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="8" r="5" /><path d="M12 13v8M9 18h6" strokeLinecap="round" /></svg>;
    case "trans":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="6" /><path d="M12 6V2m4 2l-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "man":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="10" cy="14" r="5" /><path d="M21 3l-6.5 6.5M21 3h-5M21 3v5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "clock":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" strokeLinecap="round" /></svg>;
    case "sparkle":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" strokeLinejoin="round" /></svg>;
    case "video":
      return <svg viewBox="0 0 24 24" style={s}><rect x="2" y="6" width="13" height="12" rx="2" /><path d="M15 12l7-4v8l-7-4z" /></svg>;
    case "pin":
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 21s-7-5.3-7-10a7 7 0 1114 0c0 4.7-7 10-7 10z" /><circle cx="12" cy="11" r="2" /></svg>;
    case "user":
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="8" r="4" /><path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" /></svg>;
    default:
      return null;
  }
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function check() {
      const supabase = getSupabase();
      if (!supabase) { setChecking(false); return; }
      const { data } = await supabase.auth.getUser();
      setLoggedIn(!!data?.user);
      setChecking(false);
    }
    check();
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/") return null;

  return (
    <>
      <header className="vv-header">
        <div className="vv-header-main">
          <div className="vv-header-left">
            <button
              className="vv-hamburger"
              onClick={() => setMenuOpen(true)}
              data-testid="button-hamburger"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>

          <a href="/" className="vv-logo" data-testid="link-logo">
            <span className="vv-logo-text">VIAVIP</span>
          </a>

          <div className="vv-header-right">
            <button
              className="vv-header-icon-btn"
              onClick={() => router.push("/favoritos")}
              data-testid="button-favoritos-header"
              aria-label="Favoritos"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
            {mounted && !checking ? (
              loggedIn ? (
                <button
                  className="vv-header-icon-btn"
                  onClick={() => router.push("/mi-cuenta")}
                  data-testid="button-account"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                  </svg>
                </button>
              ) : (
                <button
                  className="vv-header-icon-btn"
                  onClick={() => router.push("/registro")}
                  data-testid="button-register"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                    <path d="M20 8v4m2-2h-4" strokeLinecap="round" />
                  </svg>
                </button>
              )
            ) : (
              <span className="vv-header-icon-btn" style={{ visibility: "hidden" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </header>

      <div
        className={`vv-overlay ${menuOpen ? "vv-overlay-open" : ""}`}
        style={{ pointerEvents: menuOpen ? "auto" : "none" }}
        onClick={() => setMenuOpen(false)}
      />
      <nav className={`vvsm ${menuOpen ? "vvsm-open" : ""}`} data-testid="side-menu">
        <div className="vvsm-header">
          <span className="vvsm-logo">VIAVIP</span>
          <button
            className="vvsm-close"
            onClick={() => setMenuOpen(false)}
            data-testid="button-close-menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="vvsm-list">
          {MENU_ITEMS.map((item) => (
            <li key={item.label} className="vvsm-item">
              <Link
                href={item.href}
                className="vvsm-link"
                data-testid={`link-menu-${item.label.toLowerCase().replace(/ /g, "-")}`}
              >
                <span className="vvsm-icon"><MenuIcon name={item.icon} /></span>
                <span className="vvsm-text">{item.label.toUpperCase()}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="vvsm-cta-wrap">
          <div className="vvsm-cta-container">
            <div className="vvsm-fire-video-wrap" aria-hidden="true">
              <video
                className="vvsm-fire-video"
                src="/ui/fire.mp4"
                autoPlay
                loop
                muted
                playsInline
                disablePictureInPicture
              />
            </div>
            <Link href="/publicar" className="vvsm-cta" data-testid="link-menu-publicar">
              <span className="vvsm-cta-label">PUBLICAR PERFIL</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
