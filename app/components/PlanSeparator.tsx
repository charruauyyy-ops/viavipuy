"use client";

import { getPlanConfig } from "@/lib/plans";

interface PlanSeparatorProps {
  plan: string;
}

export default function PlanSeparator({ plan }: PlanSeparatorProps) {
  const isGeneral = plan === "general";
  const planKey = isGeneral ? "free" : plan;
  const config = getPlanConfig(planKey);
  const label = plan.toUpperCase();

  return (
    <div
      className="vv-plan-separator"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        margin: "0",
        padding: "0 16px",
        height: "28px",
      }}
    >
      <div
        className="vv-card-plan-badge"
        style={{
          position: "static",
          background: config.badge_bg,
          color: config.badge_text,
          fontSize: "11px",
          height: "24px",
          padding: "0 10px",
          fontWeight: "700",
          borderRadius: "10px",
          opacity: isGeneral ? 0.55 : 1,
          letterSpacing: "0.06em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 8px rgba(0,0,0,0.18)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "linear-gradient(to right, #c6a75e33, transparent)",
          opacity: isGeneral ? 0.18 : 0.32,
        }}
      />
    </div>
  );
}
