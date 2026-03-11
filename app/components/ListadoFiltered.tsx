"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Filtros } from "@/lib/filters";
import type { PublicacionItem } from "@/lib/queryPublicaciones";
import FilterBarSticky from "./FilterBarSticky";
import FiltersModalVIAVIP from "./FiltersModalVIAVIP";
import ListadoGrid from "./ListadoGrid";
import PlanSeparator from "./PlanSeparator";

const PAGE_SIZE = 12;

interface QueryContext {
  categoria?: string;
  extra_dep?: string;
  extra_zona?: string;
  extra_ciudad?: string;
  extra_servicio?: string;
}

interface ListadoFilteredProps {
  items: PublicacionItem[];
  count: number; // total real (verdad única)
  filtros: Filtros;
  basePath: string;
  hasFilters: boolean;
  serviciosOptions: string[];
  queryContext?: QueryContext;
}

function buildApiUrl(
  offset: number,
  filtros: Filtros,
  ctx?: QueryContext,
): string {
  const p = new URLSearchParams();
  p.set("categoria", ctx?.categoria || "mujer");
  p.set("offset", String(offset));
  p.set("limit", String(PAGE_SIZE));

  if (filtros.dep) p.set("dep", filtros.dep);
  filtros.servicios.forEach((s) => p.append("serv", s));
  filtros.atiende_en.forEach((a) => p.append("at_en", a));
  if (filtros.edad_min !== 18) p.set("edad_min", String(filtros.edad_min));
  if (filtros.edad_max !== 56) p.set("edad_max", String(filtros.edad_max));
  if (filtros.tar_min !== 800) p.set("tar_min", String(filtros.tar_min));
  if (filtros.tar_max !== 10000) p.set("tar_max", String(filtros.tar_max));
  if (filtros.alt_min !== 140) p.set("alt_min", String(filtros.alt_min));
  if (filtros.alt_max !== 184) p.set("alt_max", String(filtros.alt_max));

  if (ctx?.extra_dep) p.set("extra_dep", ctx.extra_dep);
  if (ctx?.extra_zona) p.set("extra_zona", ctx.extra_zona);
  if (ctx?.extra_ciudad) p.set("extra_ciudad", ctx.extra_ciudad);
  if (ctx?.extra_servicio) p.set("extra_servicio", ctx.extra_servicio);

  return `/api/publicaciones?${p.toString()}`;
}

export default function ListadoFiltered({
  items,
  count,
  filtros,
  basePath,
  hasFilters,
  serviciosOptions,
  queryContext,
}: ListadoFilteredProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const [itemsState, setItemsState] = useState<PublicacionItem[]>(() => items);

  const [offset, setOffset] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  // ✅ VERDAD ÚNICA: hay más si lo que renderizamos es < total count
  const [hasMore, setHasMore] = useState(
    () => items.slice(0, PAGE_SIZE).length < count,
  );

  const [showScrollTop, setShowScrollTop] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // ✅ lock real anti-spam (no depende de setState async)
  const loadingRef = useRef(false);

  // ✅ dedup robusto por id
  const seenIds = useRef(new Set<string | number>());

  // ✅ evita respuestas viejas cuando cambian filtros/props
  const requestSeq = useRef(0);

  useEffect(() => {
    const initial = items;

    setItemsState(initial);
    setOffset(initial.length); // 👈 importante: offset real = lo que tenés
    setHasMore(initial.length < count);

    seenIds.current = new Set(initial.map((i) => i.id));

    // reset locks
    loadingRef.current = false;
    setLoading(false);
    requestSeq.current += 1;
  }, [items, count]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (!hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    const mySeq = ++requestSeq.current;

    try {
      const url = buildApiUrl(offset, filtros, queryContext);
      const res = await fetch(url);
      if (!res.ok) {
        setHasMore(false);
        return;
      }

      const data = await res.json();
      if (mySeq !== requestSeq.current) return; // ignora si ya cambió el contexto

      const rawItems: PublicacionItem[] = Array.isArray(data.items)
        ? data.items
        : [];
      if (rawItems.length === 0) {
        setHasMore(false);
        return;
      }

      const newItems = rawItems.filter((i) => !seenIds.current.has(i.id));
      newItems.forEach((i) => seenIds.current.add(i.id));

      if (newItems.length > 0) {
        setItemsState((prev) => {
          // merge sin duplicar (por las dudas)
          const map = new Map<string | number, PublicacionItem>();
          for (const it of prev) map.set(it.id, it);
          for (const it of newItems) map.set(it.id, it);
          return Array.from(map.values());
        });
      }

      // ✅ offset real: avanzá por lo que te devolvió el server (no siempre +12)
      setOffset((prev) => prev + rawItems.length);

      // ✅ hasMore por count (no dependemos de data.hasMore)
      setHasMore((prevHasMore) => {
        // usamos un cálculo basado en lo que ya tenemos (después del merge)
        // como setState es async, aproximamos con seenIds size (dedup global)
        const totalLoaded = seenIds.current.size;
        return totalLoaded < count;
      });
    } catch {
      // si falla, no mates el infinite scroll para siempre;
      // pero evitá loop infinito: frenamos hasta que cambie el contexto.
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [offset, filtros, queryContext, hasMore, count]);

  // ✅ IntersectionObserver tipo LIMBO: prefetch antes del final
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) loadMore();
      },
      {
        root: null, // window/html (tu caso)
        rootMargin: "1200px 0px", // 👈 más agresivo = más “Limbo” en mobile
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ✅ Botón ↑ con scroll window (tu caso confirmado)
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setShowScrollTop(window.scrollY > 600);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const grouped = itemsState.reduce(
    (acc, item) => {
      let plan = (item.plan_actual || "general").trim().toLowerCase();
      if (!["diamante", "platino", "plus"].includes(plan)) plan = "general";
      (acc[plan] ||= []).push(item);
      return acc;
    },
    {} as Record<string, PublicacionItem[]>,
  );

  const planOrder = ["diamante", "platino", "plus", "general"];

  return (
    <>
      <FilterBarSticky
        count={count}
        onOpenModal={() => setModalOpen(true)}
        hasFilters={hasFilters}
      />

      {planOrder.map((plan, index) => {
        const planItems = grouped[plan];
        if (!planItems || planItems.length === 0) return null;

        const gridItems = planItems.map(({ user_id, ...rest }) => ({
          ...rest,
          fotos: rest.fotos || [],
        }));

        return (
          <section
            key={plan}
            className="vv-plan-section"
            style={{
              marginTop: index === 0 ? "6px" : "12px",
              marginBottom: "0",
            }}
          >
            <div style={{ marginBottom: "6px" }}>
              <PlanSeparator plan={plan} />
            </div>
            <ListadoGrid items={gridItems} basePath={basePath} />
          </section>
        );
      })}

      {/* loader */}
      {loading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "24px 0",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid rgba(198,167,94,0.2)",
              borderTopColor: "#c6a75e",
              borderRadius: "50%",
              animation: "vv-spin 0.7s linear infinite",
            }}
          />
        </div>
      )}

      {/* ✅ padding por bottom nav + sentinel SIEMPRE al final (evita re-disparos raros) */}
      <div style={{ height: 140 }} />
      <div ref={sentinelRef} style={{ height: 1 }} />

      <FiltersModalVIAVIP
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        filtros={filtros}
        serviciosOptions={serviciosOptions}
      />

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Volver arriba"
          data-testid="button-scroll-top"
          style={{
            position: "fixed",
            right: 18,
            bottom: 110,
            zIndex: 9999,
            width: 44,
            height: 44,
            borderRadius: 999,
            background: "rgba(18,18,18,0.92)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1px solid rgba(198,167,94,0.35)",
            color: "#c6a75e",
            fontWeight: 800,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "opacity 0.25s ease",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </>
  );
}
