"use client";

interface FilterBarStickyProps {
  count: number;
  onOpenModal: () => void;
  hasFilters?: boolean;
}

export default function FilterBarSticky({ count, onOpenModal, hasFilters }: FilterBarStickyProps) {
  return (
    <div className="vv-filter-bar-sticky" data-testid="filter-bar-sticky">
      <span className="vv-filter-bar-count" data-testid="text-escort-count">
        {count} escort{count !== 1 ? "s" : ""}
      </span>
      <button
        className={`vv-filter-bar-btn ${hasFilters ? "vv-filter-bar-btn-active" : ""}`}
        onClick={onOpenModal}
        data-testid="button-buscar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        Buscar
      </button>
    </div>
  );
}
