"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Mujeres", href: "/mujeres" },
  { label: "Trans", href: "/trans" },
  { label: "Hombres", href: "/hombres" },
  { label: "PdE", href: "/pde" },
  { label: "MVD", href: "/mvd" },
];

export default function CategoryTabs() {
  const pathname = usePathname();

  return (
    <div className="vv-cat-tabs" data-testid="category-tabs">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`vv-cat-tab ${isActive ? "vv-cat-tab-active" : ""}`}
            data-testid={`tab-${tab.label.toLowerCase()}`}
          >
            {tab.label}
          </Link>
        );
      })}
      <div className="vv-cat-tabs-divider" />
    </div>
  );
}
