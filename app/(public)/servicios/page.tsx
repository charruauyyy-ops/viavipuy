"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { makeServiceSlug } from "@/lib/slugify";

interface ServicioRow {
  id: string;
  nombre: string;
  categoria: string;
}

const CATEGORIA_ORDER = ["servicios", "sexo_oral", "fantasias", "virtuales", "masajes", "idiomas"];

const CATEGORIA_TITLES: Record<string, string> = {
  servicios: "Servicios",
  sexo_oral: "Sexo oral",
  fantasias: "Fantasias",
  virtuales: "Servicios virtuales",
  masajes: "Tipos de masajes",
  idiomas: "Idiomas",
};

export default function ServiciosPage() {
  const [catalog, setCatalog] = useState<Record<string, ServicioRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchCatalog() {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no configurado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("servicios")
        .select("id,nombre,categoria")
        .order("categoria")
        .order("nombre");

      if (fetchErr) {
        setError("Error cargando servicios.");
        setLoading(false);
        return;
      }

      const grouped: Record<string, ServicioRow[]> = {};
      for (const row of data || []) {
        if (!grouped[row.categoria]) grouped[row.categoria] = [];
        grouped[row.categoria].push(row);
      }
      setCatalog(grouped);
    } catch {
      setError("Error inesperado.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCatalog();
  }, []);

  return (
    <main className="vv-form-page">
      <div className="vvs-catalog-container">
        <div className="vvs-catalog-header">
          <Link href="/" className="vvs-back-link" data-testid="link-back-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Inicio
          </Link>
          <h1 className="vvs-catalog-title" data-testid="text-catalog-title">Servicios</h1>
          <p className="vvs-catalog-subtitle">Explora todos los servicios disponibles en VIAVIP</p>
        </div>

        {loading ? (
          <div className="vvs-loading">
            <p className="vv-form-loading">Cargando servicios...</p>
          </div>
        ) : error ? (
          <div className="vvs-error">
            <div className="vv-form-error-box">{error}</div>
            <button type="button" className="vv-btn-secondary" onClick={fetchCatalog} data-testid="button-retry" style={{ marginTop: 12 }}>
              Reintentar
            </button>
          </div>
        ) : Object.keys(catalog).length === 0 ? (
          <div className="vvs-empty">
            <p>No hay servicios disponibles.</p>
          </div>
        ) : (
          CATEGORIA_ORDER.map((cat) => {
            const items = catalog[cat];
            if (!items || items.length === 0) return null;
            return (
              <div key={cat} className="vvs-catalog-section">
                <h2 className="vvs-catalog-section-title">{CATEGORIA_TITLES[cat] || cat}</h2>
                <div className="vvs-catalog-chips">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/servicios/${makeServiceSlug(item.nombre, item.id)}`}
                      className="vvs-catalog-chip"
                      data-testid={`chip-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {item.nombre}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
