"use client";

import { useState } from "react";

interface CollapsibleTextProps {
  expandedText: string;
}

export default function CollapsibleText({ expandedText }: CollapsibleTextProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="vv-collapsible" data-testid="collapsible-text">
      <div className={`vv-collapsible-body ${open ? "vv-collapsible-open" : ""}`}>
        <p className="vv-collapsible-content">{expandedText}</p>
      </div>
      <button
        className="vv-collapsible-toggle"
        onClick={() => setOpen(!open)}
        data-testid="button-ver-mas"
      >
        {open ? "Ver menos" : "Ver mas"}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`vv-collapsible-chevron ${open ? "vv-collapsible-chevron-up" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
