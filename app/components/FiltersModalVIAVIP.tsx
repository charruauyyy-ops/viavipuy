"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { type Filtros, DEFAULTS, DEPARTAMENTOS, ATIENDE_EN_OPTIONS, buildSearchParams } from "@/lib/filters";

interface FiltersModalProps {
  open: boolean;
  onClose: () => void;
  filtros: Filtros;
  serviciosOptions: string[];
}

function RangeSlider({
  label,
  min,
  max,
  valueMin,
  valueMax,
  onChange,
  formatValue,
  step,
}: {
  label: string;
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  formatValue: (v: number) => string;
  step?: number;
}) {
  const s = step || 1;
  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;

  return (
    <div className="vvf-range-group">
      <div className="vvf-range-header">
        <span className="vvf-range-label">{label}</span>
        <span className="vvf-range-value">{formatValue(valueMin)} — {formatValue(valueMax)}</span>
      </div>
      <div className="vvf-range-track-wrap">
        <div className="vvf-range-track">
          <div
            className="vvf-range-fill"
            style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
          />
        </div>
        <input
          type="range"
          className="vvf-range-input vvf-range-min"
          min={min}
          max={max}
          step={s}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v <= valueMax) onChange(v, valueMax);
          }}
        />
        <input
          type="range"
          className="vvf-range-input vvf-range-max"
          min={min}
          max={max}
          step={s}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= valueMin) onChange(valueMin, v);
          }}
        />
      </div>
    </div>
  );
}

export default function FiltersModalVIAVIP({ open, onClose, filtros, serviciosOptions }: FiltersModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [local, setLocal] = useState<Filtros>({ ...filtros });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setLocal({ ...filtros });
  }, [open, filtros]);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    const raf = requestAnimationFrame(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.touchAction = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const update = useCallback((patch: Partial<Filtros>) => {
    setLocal((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApply = () => {
    const qs = buildSearchParams(local);
    router.push(`${pathname}${qs}`);
    onClose();
  };

  const handleClear = () => {
    setLocal({ ...DEFAULTS });
    router.push(pathname);
    onClose();
  };

  if (!open || !mounted) return null;

  const modal = (
    <div className="vvf-overlay" onClick={onClose} data-testid="filters-overlay">
      <div className="vvf-modal" onClick={(e) => e.stopPropagation()} data-testid="filters-modal">
        <div className="vvf-modal-header">
          <h2 className="vvf-modal-title">Filtros</h2>
          <button className="vvf-modal-close" onClick={onClose} data-testid="button-close-filters">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="vvf-modal-body" ref={modalBodyRef}>
          <div className="vvf-field">
            <label className="vvf-field-label">Ubicacion</label>
            <select
              className="vvf-select"
              value={local.dep || ""}
              onChange={(e) => update({ dep: e.target.value || undefined })}
              data-testid="select-departamento"
            >
              <option value="">Todos los departamentos</option>
              {DEPARTAMENTOS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="vvf-field">
            <label className="vvf-field-label">Servicios</label>
            <select
              className="vvf-select"
              value={local.servicios[0] || ""}
              onChange={(e) => update({ servicios: e.target.value ? [e.target.value] : [] })}
              data-testid="select-servicios"
            >
              <option value="">Seleccionar servicio</option>
              {serviciosOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="vvf-field">
            <label className="vvf-field-label">Atencion en</label>
            <select
              className="vvf-select"
              value={local.atiende_en[0] || ""}
              onChange={(e) => update({ atiende_en: e.target.value ? [e.target.value] : [] })}
              data-testid="select-atencion"
            >
              <option value="">Lugar de encuentro</option>
              {ATIENDE_EN_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="vvf-divider" />

          <RangeSlider
            label="Edad"
            min={18}
            max={56}
            valueMin={local.edad_min}
            valueMax={local.edad_max}
            onChange={(mn, mx) => update({ edad_min: mn, edad_max: mx })}
            formatValue={(v) => `${v} años`}
          />

          <RangeSlider
            label="Tarifa"
            min={800}
            max={10000}
            step={100}
            valueMin={local.tar_min}
            valueMax={local.tar_max}
            onChange={(mn, mx) => update({ tar_min: mn, tar_max: mx })}
            formatValue={(v) => `$${v.toLocaleString()} UYU`}
          />

          <RangeSlider
            label="Altura"
            min={140}
            max={184}
            valueMin={local.alt_min}
            valueMax={local.alt_max}
            onChange={(mn, mx) => update({ alt_min: mn, alt_max: mx })}
            formatValue={(v) => `${v} cm`}
          />
        </div>

        <div className="vvf-modal-footer">
          <button className="vvf-btn-clear" onClick={handleClear} data-testid="button-limpiar">
            Limpiar
          </button>
          <button className="vvf-btn-apply" onClick={handleApply} data-testid="button-aplicar-filtros">
            Buscar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
