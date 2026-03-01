"use client";

import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Disponibles",
    href: "/mujeres",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c1.5 2 4 5 4 8a4 4 0 01-8 0c0-3 2.5-6 4-8z" />
        <path d="M12 22v-6" />
        <path d="M9 18h6" />
      </svg>
    ),
  },
  {
    label: "Nuevas",
    href: "/nuevas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
      </svg>
    ),
  },
  {
    label: "Cerca",
    href: "/cerca",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Favoritos",
    href: "/favoritos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <nav className="vvbn-nav" data-testid="bottom-nav">
      <div className="vvbn-bar">
        <div className="vvbn-glow-line" />
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <a
              key={item.label}
              href={item.href}
              className={`vvbn-item ${isActive ? "vvbn-item-active" : ""}`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <span className="vvbn-icon">{item.icon}</span>
              <span className="vvbn-label">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
