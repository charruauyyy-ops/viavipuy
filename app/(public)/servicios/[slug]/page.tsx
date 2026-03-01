"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { parseServiceSlug, slugify } from "@/lib/slugify";
import ListadoGrid from "@/app/components/ListadoGrid";

interface Servicio {
  id: string;
  nombre: string;
  categoria: string;
}

interface Publicacion {
  id: string | number;
  nombre?: string;
  edad?: number;
  zona?: string;
  ciudad?: string;
  cover_url?: string;
  disponible?: boolean;
  rating?: number;
  plan_actual?: string;
  categoria?: string;
}

type CatTab = "mujeres" | "hombres" | "trans";

const VALID_CATS: CatTab[] = ["mujeres", "hombres", "trans"];

const CAT_TAB_TO_DB: Record<CatTab, string> = {
  mujeres: "mujer",
  hombres: "hombre",
  trans: "trans",
};

const ALL_ARRAY_COLUMNS = [
  "servicios",
  "sexo_oral",
  "fantasias",
  "servicios_virtuales",
  "tipos_masajes",
  "idiomas",
];

export default function ServicioDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const parsed = parseServiceSlug(slug);
  const rawCat = searchParams.get("cat");
  const initialCat: CatTab = VALID_CATS.includes(rawCat as CatTab) ? (rawCat as CatTab) : "mujeres";

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [items, setItems] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CatTab>(initialCat);
  const [infoOpen, setInfoOpen] = useState(false);

  const fetchData = useCallback(async (cat: CatTab) => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no configurado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let svc: Servicio | null = null;

      if (parsed.uuid) {
        const { data, error: svcErr } = await supabase
          .from("servicios")
          .select("id,nombre,categoria")
          .eq("id", parsed.uuid)
          .single();

        if (!svcErr && data) svc = data;
        else console.debug("[servicios] UUID not found in servicios table:", parsed.uuid);
      }

      if (!svc && parsed.nameSlug) {
        const { data: allSvcs } = await supabase
          .from("servicios")
          .select("id,nombre,categoria");

        if (allSvcs) {
          svc = allSvcs.find((s) => slugify(s.nombre) === parsed.nameSlug) || null;
        }
        if (!svc) console.debug("[servicios] No servicio found by name slug:", parsed.nameSlug);
      }

      if (!svc) {
        setError("Servicio no encontrado.");
        setLoading(false);
        return;
      }
      setServicio(svc);

      const dbCat = CAT_TAB_TO_DB[cat];
      const serviceName = svc.nombre;
      const seenIds = new Set<string>();
      let allPubs: Publicacion[] = [];

      for (const col of ALL_ARRAY_COLUMNS) {
        try {
          const { data: colPubs } = await supabase
            .from("publicaciones")
            .select("id,nombre,edad,zona,ciudad,cover_url,disponible,rating,plan_actual,categoria")
            .eq("categoria", dbCat)
            .contains(col, [serviceName])
            .not("cover_url", "is", null)
            .neq("cover_url", "");

          if (colPubs) {
            for (const p of colPubs) {
              const pid = String(p.id);
              if (!seenIds.has(pid)) {
                seenIds.add(pid);
                allPubs.push(p);
              }
            }
          }
        } catch {
          console.debug("[servicios] Column not queryable, skipping:", col);
        }
      }

      try {
        const { data: links } = await supabase
          .from("publicacion_servicios")
          .select("publicacion_id")
          .eq("servicio_id", svc.id);

        if (links && links.length > 0) {
          const missingIds = links
            .map((l: { publicacion_id: string }) => l.publicacion_id)
            .filter((pid: string) => !seenIds.has(pid));

          if (missingIds.length > 0) {
            const { data: joinPubs } = await supabase
              .from("publicaciones")
              .select("id,nombre,edad,zona,ciudad,cover_url,disponible,rating,plan_actual,categoria")
              .in("id", missingIds)
              .eq("categoria", dbCat)
              .not("cover_url", "is", null)
              .neq("cover_url", "");

            if (joinPubs) {
              for (const p of joinPubs) {
                seenIds.add(String(p.id));
                allPubs.push(p);
              }
            }
          }
        }
      } catch {
        console.debug("[servicios] publicacion_servicios table not queryable");
      }

      if (allPubs.length === 0) {
        console.debug("[servicios] No results from array columns or join table for:", serviceName, "cat:", dbCat);
      }

      const planOrder: Record<string, number> = { diamante: 0, platino: 1, plus: 2, free: 3 };
      allPubs.sort((a, b) => {
        const pa = planOrder[(a.plan_actual || "free").toLowerCase()] ?? 3;
        const pb = planOrder[(b.plan_actual || "free").toLowerCase()] ?? 3;
        return pa - pb;
      });

      setItems(allPubs);
    } catch {
      setError("Error inesperado.");
    }
    setLoading(false);
  }, [parsed.uuid, parsed.nameSlug]);

  useEffect(() => {
    fetchData(activeCat);
  }, [activeCat, fetchData]);

  function handleCatChange(cat: CatTab) {
    setActiveCat(cat);
    const url = new URL(window.location.href);
    url.searchParams.set("cat", cat);
    window.history.replaceState({}, "", url.toString());
  }

  const catBasePath = `/${activeCat}`;

  return (
    <main className="vv-form-page" style={{ paddingTop: 0 }}>
      <div className="vvs-detail-container">
        <div className="vvs-detail-header">
          <Link href="/servicios" className="vvs-back-link" data-testid="link-back-servicios">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Servicios
          </Link>
          <h1 className="vvs-detail-title" data-testid="text-service-title">
            Escorts {servicio?.nombre || "..."} en Uruguay
          </h1>
          {servicio && (
            <span className="vvs-detail-cat-badge">{servicio.categoria}</span>
          )}
        </div>

        <div className="vvs-info-block">
          <button
            type="button"
            className="vvs-info-toggle"
            onClick={() => setInfoOpen(!infoOpen)}
            data-testid="button-info-toggle"
          >
            <span>Que es {servicio?.nombre || "este servicio"}?</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ width: 18, height: 18, transform: infoOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s ease" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {infoOpen && (
            <div className="vvs-info-content" data-testid="text-info-content">
              <p>
                {servicio?.nombre} es un servicio ofrecido por escorts verificadas en Uruguay a traves de VIAVIP.
                Explora los perfiles disponibles y contacta directamente para mas informacion.
              </p>
            </div>
          )}
        </div>

        <div className="vvs-tabs" data-testid="tabs-category">
          {(["mujeres", "hombres", "trans"] as CatTab[]).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`vvs-tab ${activeCat === cat ? "vvs-tab-active" : ""}`}
              onClick={() => handleCatChange(cat)}
              data-testid={`tab-${cat}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {!loading && !error && (
          <p className="vvs-count" data-testid="text-count">
            {items.length} escort{items.length !== 1 ? "s" : ""}
          </p>
        )}

        {loading ? (
          <div className="vvs-loading">
            <p className="vv-form-loading">Cargando...</p>
          </div>
        ) : error ? (
          <div className="vvs-error">
            <div className="vv-form-error-box">{error}</div>
          </div>
        ) : items.length === 0 ? (
          <div className="vvs-empty" data-testid="text-empty">
            <p>Todavia no hay publicaciones con este servicio.</p>
          </div>
        ) : (
          <ListadoGrid items={items} basePath={catBasePath} />
        )}
      </div>
    </main>
  );
}
