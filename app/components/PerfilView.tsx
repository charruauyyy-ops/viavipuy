"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { getPlanConfig } from "@/lib/plans";
import { trackProfileEvent } from "@/lib/trackEvent";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import { makeServiceSlug, slugify } from "@/lib/slugify";
import { isDisponibleAhora, getActivityLabel } from "@/lib/disponibilidad";
import { isLocalFavorite, toggleLocalFavorite } from "@/lib/favoritesLocal";
import StoryViewer from "./StoryViewer";
import VerticalGallery from "./VerticalGallery";
import WhatsAppButton from "./WhatsAppButton";
import VerificationBadge from "./VerificationBadge";

import ApproxMapEmbed from "./ApproxMapEmbed";
import type { MediaItem } from "./GalleryViewer";

interface Publicacion {
  id: string;
  nombre?: string;
  edad?: number;
  zona?: string;
  ciudad?: string;
  departamento?: string;
  cover_url?: string;
  disponible?: boolean;
  ultima_actividad?: string;
  rating?: number;
  descripcion?: string;
  user_id?: string;
  categoria?: string;
  altura_cm?: number;
  peso_kg?: number;
  atiende_en?: string | string[];
  atiende_a?: string[];
  horarios?: string;
  tarifa_hora?: number;
  acepta_usd?: boolean;
  tarifas?: Record<string, number | null> | string | null;
  consultar_precio?: boolean;
  telefono?: string;
  telefono_whatsapp?: string | null;
  telegram_username?: string | null;
  telefono_visible?: boolean;
  video_disponible?: boolean;
  servicios?: string[];
  sexo_oral?: string | string[];
  fantasias?: string[];
  servicios_virtuales?: string[];
  tipos_masajes?: string[];
  idiomas?: string[];
  fotos?: string[];
  videos?: string[];
}

interface Comment {
  id: string;
  autor: string | null;
  rating: number | null;
  comentario: string;
  created_at: string;
  respuesta: string | null;
  respondida_at: string | null;
}

type TabId = "principal" | "servicios" | "opiniones";

interface ServiceChip {
  nombre: string;
  id: string | null;
}

interface ServiceGroup {
  title: string;
  icon: string;
  items: ServiceChip[];
}

interface PerfilViewProps {
  category: "mujeres" | "hombres" | "trans";
}

const CATEGORY_DB_MAP: Record<string, string> = {
  mujeres: "mujer",
  hombres: "hombre",
  trans: "trans",
};

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "contenido_falso", label: "Contenido falso" },
  { value: "menor", label: "Menor de edad" },
  { value: "otro", label: "Otro" },
];

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

const WA_MSG = "Hola, te contacto desde VIAVIP. ¿Estás disponible?";
const WA_VIDEO_MSG =
  "Hola, te contacto desde VIAVIP. Me interesa una videollamada. ¿Estás disponible?";
const TG_MSG = "Hola, te contacto desde VIAVIP. ¿Estás disponible?";

function getWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(WA_MSG)}`;
}

function getWhatsAppVideoUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(WA_VIDEO_MSG)}`;
}

function getTelegramUrl(username: string): string {
  return `https://t.me/${username}?text=${encodeURIComponent(TG_MSG)}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9)
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 8)
    return `${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4)}`;
  if (digits.length >= 11)
    return `+${digits.slice(0, digits.length - 9)} ${digits.slice(-9, -6)} ${digits.slice(-6, -3)} ${digits.slice(-3)}`;
  if (digits.length === 10)
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  return phone;
}

export default function PerfilView({
  category,
  children,
}: PerfilViewProps & { children?: React.ReactNode }) {
  const params = useParams();
  const id = params?.id as string;
  const [pub, setPub] = useState<Publicacion | null>(null);
  const [planId, setPlanId] = useState("free");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("principal");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratingPromedio, setRatingPromedio] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0);
  const [commentNombre, setCommentNombre] = useState("");
  const [commentAnonimo, setCommentAnonimo] = useState(false);
  const [commentSending, setCommentSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userStories, setUserStories] = useState<
    {
      id: string;
      user_id: string;
      media_url: string;
      media_type: "image" | "video";
      caption?: string;
      caption_json?: {
        line1?: string;
        line2?: string;
        color1?: string;
        color2?: string;
      } | null;
      created_at: string;
      nombre: string;
      zona: string;
      avatar_url?: string;
    }[]
  >([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyPreview, setStoryPreview] = useState<{
    text: string;
    time: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [socialLinks, setSocialLinks] = useState<{
    instagram_url?: string | null;
    onlyfans_url?: string | null;
    twitter_url?: string | null;
  }>({});
  const contactInfo = {
    telefono_whatsapp: pub?.telefono_whatsapp ?? null,
    telegram_username: pub?.telegram_username ?? null,
    telefono_visible: pub?.telefono_visible ?? false,
    video_disponible: pub?.video_disponible ?? false,
  };
  const [servicioLookup, setServicioLookup] = useState<Record<string, string>>(
    {},
  );
  const [joinServiceGroups, setJoinServiceGroups] = useState<
    ServiceGroup[] | null
  >(null);

  const principalRef = useRef<HTMLDivElement>(null);
  const serviciosRef = useRef<HTMLDivElement>(null);
  const opinionesRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const favModeRef = useRef<"local" | "db">("local");

  useEffect(() => {
    async function checkFav() {
      if (!id) return;
      const supabase = getSupabase();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          favModeRef.current = "db";
          const { data } = await supabase
            .from("favoritos")
            .select("id")
            .eq("user_id", user.id)
            .eq("publicacion_id", id)
            .maybeSingle();
          setIsFav(!!data);
          return;
        }
      }
      favModeRef.current = "local";
      setIsFav(isLocalFavorite(id));
    }
    checkFav();
  }, [id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadServicioLookup() {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase.from("servicios").select("id,nombre");
      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) {
          map[row.nombre.toLowerCase()] = row.id;
          const normalized = row.nombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          if (normalized !== row.nombre.toLowerCase()) {
            map[normalized] = row.id;
          }
        }
        setServicioLookup(map);
      }
    }
    loadServicioLookup();
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase || !id) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) setCurrentUserId(userData.user.id);

      const { data } = await supabase
        .from("publicaciones")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const expectedCat = CATEGORY_DB_MAP[category];
        if (data.categoria && data.categoria !== expectedCat) {
          setPub(null);
          setLoading(false);
          return;
        }
        setPub(data as Publicacion);
        setIsVerified(data.verification_status === "verified");
        const rawPlan = (data.plan_actual || "free").toLowerCase();
        setPlanId(rawPlan);
        await loadRatingSummary();
        if (data.user_id) {
          trackProfileEvent(data.user_id, "view", { publicacion_id: id });
        }
      }
      setLoading(false);
    }
    load();
  }, [id, category]);

  useEffect(() => {
    async function loadJoinServices() {
      if (!id) return;
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data: links } = await supabase
          .from("publicacion_servicios")
          .select("servicio_id, servicios(id, nombre, categoria)")
          .eq("publicacion_id", id);

        if (links && links.length > 0) {
          const catMap: Record<string, string> = {
            servicios: "Servicios",
            sexo_oral: "Sexo Oral",
            fantasias: "Fantasias",
            virtuales: "Servicios Virtuales",
            masajes: "Masajes",
            idiomas: "Idiomas",
          };
          const catIcons: Record<string, string> = {
            servicios: "star",
            sexo_oral: "lips",
            fantasias: "sparkle",
            virtuales: "video",
            masajes: "star",
            idiomas: "users",
          };
          const catOrder = [
            "servicios",
            "sexo_oral",
            "fantasias",
            "virtuales",
            "masajes",
            "idiomas",
          ];

          const grouped: Record<string, ServiceChip[]> = {};
          const seen = new Set<string>();
          for (const link of links) {
            const svc = (link as any).servicios;
            if (!svc || !svc.id) continue;
            if (seen.has(svc.id)) continue;
            seen.add(svc.id);
            const cat = svc.categoria || "servicios";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ nombre: svc.nombre, id: svc.id });
          }

          const groups: ServiceGroup[] = [];
          for (const cat of catOrder) {
            if (grouped[cat] && grouped[cat].length > 0) {
              groups.push({
                title: catMap[cat] || cat,
                icon: catIcons[cat] || "star",
                items: grouped[cat],
              });
            }
          }
          if (groups.length > 0) {
            setJoinServiceGroups(groups);
            return;
          }
        }
      } catch {
        console.debug(
          "[perfil] publicacion_servicios query failed, using legacy arrays",
        );
      }
      setJoinServiceGroups(null);
    }
    loadJoinServices();
  }, [id]);

  useEffect(() => {
    async function loadSocial() {
      if (!pub?.user_id) return;
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase
        .from("profiles")
        .select("instagram_url, onlyfans_url, twitter_url")
        .eq("id", pub.user_id)
        .maybeSingle();
      if (data) {
        setSocialLinks(data);
      }
    }
    loadSocial();
  }, [pub?.user_id]);

  useEffect(() => {
    async function loadStories() {
      if (!pub?.user_id) {
        setUserStories([]);
        return;
      }
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: raw } = await supabase
        .from("diamante_stories")
        .select(
          "id, user_id, media_url, media_type, caption, caption_json, created_at",
        )
        .eq("user_id", pub.user_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (raw && raw.length > 0) {
        const nombre = pub.nombre || "Perfil";
        const zona = pub.zona || pub.ciudad || "";
        const avatar = pub.cover_url || undefined;
        setUserStories(
          raw.map(
            (s: {
              id: string;
              user_id: string;
              media_url: string;
              media_type: "image" | "video";
              caption?: string;
              caption_json?: {
                line1?: string;
                line2?: string;
                color1?: string;
                color2?: string;
              } | null;
              created_at: string;
            }) => ({
              ...s,
              nombre,
              zona,
              avatar_url: avatar,
            }),
          ),
        );
        const latest = raw[0];
        let previewText = "Historia nueva";
        if (latest.caption_json && typeof latest.caption_json === "object") {
          const cj = latest.caption_json as { line1?: string; text?: string };
          if (cj.line1) previewText = cj.line1;
          else if (cj.text) previewText = (cj as { text: string }).text;
        } else if (latest.caption && typeof latest.caption === "string") {
          try {
            const parsed = JSON.parse(latest.caption);
            if (parsed?.line1) previewText = parsed.line1;
            else if (parsed?.text) previewText = parsed.text;
            else previewText = latest.caption;
          } catch {
            previewText = latest.caption;
          }
        }
        const diff = Date.now() - new Date(latest.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        let timeStr = "Ahora";
        if (mins >= 1 && mins < 60) timeStr = `Hace ${mins} min`;
        else if (mins >= 60 && mins < 1440)
          timeStr = `Hace ${Math.floor(mins / 60)} h`;
        else if (mins >= 1440) timeStr = `Hace ${Math.floor(mins / 1440)} d`;
        setStoryPreview({ text: previewText, time: timeStr });
      } else {
        setUserStories([]);
        setStoryPreview(null);
      }
    }
    loadStories();
  }, [pub]);

  async function loadRatingSummary() {
    const supabase = getSupabase();
    if (!supabase || !id) return;
    try {
      const { data, error } = await supabase
        .from("v_publicaciones_rating")
        .select("rating_promedio, total_opiniones")
        .eq("publicacion_id", id)
        .maybeSingle();
      if (error) {
        console.error("[perfil] Error loading rating summary:", error.message);
        return;
      }
      if (data?.rating_promedio != null) {
        setRatingPromedio(Number(data.rating_promedio));
      } else {
        setRatingPromedio(null);
      }
    } catch (err) {
      console.error("[perfil] Failed to load rating summary:", err);
    }
  }

  async function loadOpiniones() {
    const supabase = getSupabase();
    if (!supabase || !id) return;
    try {
      const { data, error } = await supabase
        .from("opiniones")
        .select("id, autor, rating, comentario, created_at, respuesta, respondida_at")
        .eq("publicacion_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[perfil] Error loading opiniones:", error.message);
        return;
      }
      setComments(data || []);
    } catch (err) {
      console.error("[perfil] Failed to load opiniones:", err);
    }
  }

  useEffect(() => {
    if (id) {
      loadOpiniones();
      loadRatingSummary();
    }
  }, [id]);

  const handleScroll = useCallback(() => {
    setShowScrollTop(window.scrollY > 400);
    const tabsEl = tabsRef.current;
    if (!tabsEl) return;
    const tabsBottom = tabsEl.getBoundingClientRect().bottom;
    const offset = tabsBottom + 20;
    const sections = [
      { id: "opiniones" as TabId, ref: opinionesRef },
      { id: "servicios" as TabId, ref: serviciosRef },
      { id: "principal" as TabId, ref: principalRef },
    ];
    for (const section of sections) {
      if (section.ref.current) {
        const rect = section.ref.current.getBoundingClientRect();
        if (rect.top <= offset) {
          setActiveTab(section.id);
          return;
        }
      }
    }
    setActiveTab("principal");
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function scrollToSection(tab: TabId) {
    setActiveTab(tab);
    const refs: Record<TabId, React.RefObject<HTMLDivElement | null>> = {
      principal: principalRef,
      servicios: serviciosRef,
      opiniones: opinionesRef,
    };
    const el = refs[tab]?.current;
    if (el) {
      const tabsHeight = tabsRef.current?.offsetHeight || 44;
      const headerHeight = 57;
      const y =
        el.getBoundingClientRect().top +
        window.scrollY -
        headerHeight -
        tabsHeight -
        4;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleFav() {
    if (!id) return;

    if (favModeRef.current === "local") {
      const { nowFav } = toggleLocalFavorite(id);
      setIsFav(nowFav);
      return;
    }

    const supabase = getSupabase();
    if (!supabase || !currentUserId) return;

    const next = !isFav;
    setIsFav(next);
    if (next) {
      const { error } = await supabase
        .from("favoritos")
        .upsert(
          { user_id: currentUserId, publicacion_id: id },
          { onConflict: "user_id,publicacion_id" },
        );
      if (error) setIsFav(false);
      else if (pub?.user_id)
        trackProfileEvent(pub.user_id, "favorite", { publicacion_id: id });
    } else {
      const { error } = await supabase
        .from("favoritos")
        .delete()
        .eq("user_id", currentUserId)
        .eq("publicacion_id", id);
      if (error) setIsFav(true);
    }
  }

  async function handleReport() {
    if (reportSending) return;
    setReportSending(true);
    const supabase = getSupabase();
    if (supabase && id) {
      const { error } = await supabase.from("reports").insert({
        publicacion_id: id,
        reason: reportReason,
        details: reportDetails.trim() || null,
        reporter_user_id: currentUserId || null,
      });
      if (error) {
        setReportSending(false);
        return;
      }
    }
    setReportSending(false);
    setReportSent(true);
    setTimeout(() => {
      setReportOpen(false);
      setReportSent(false);
      setReportReason("spam");
      setReportDetails("");
    }, 1500);
  }

  async function handleComment() {
    const comentario = commentText.trim();
    if (commentSending || !comentario || comentario.length < 5 || commentRating < 1 || commentRating > 5) return;
    setCommentSending(true);
    try {
      const res = await fetch("/api/opiniones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicacion_id: id,
          comentario,
          rating: commentRating,
          nombre: commentNombre.trim() || undefined,
          anonimo: commentAnonimo,
        }),
      });
      if (res.ok) {
        setCommentText("");
        setCommentRating(0);
        setCommentNombre("");
        setCommentAnonimo(false);
        await loadOpiniones();
        await loadRatingSummary();
      }
    } catch (err) {
      console.error("[perfil] Failed to insert opinion:", err);
    }
    setCommentSending(false);
  }

  function toChips(names: string[]): ServiceChip[] {
    return names.map((n) => {
      const svcId =
        servicioLookup[n.toLowerCase()] ||
        servicioLookup[
          n
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
        ] ||
        null;
      return { nombre: n, id: svcId };
    });
  }

  function buildLegacyServiceGroups(p: Publicacion): ServiceGroup[] {
    const groups: ServiceGroup[] = [];
    const servicios = normalizeArray(p.servicios);
    const sexoOral = normalizeArray(p.sexo_oral);
    const fantasias = normalizeArray(p.fantasias);
    const virtuales = normalizeArray(p.servicios_virtuales);
    const masajes = normalizeArray(p.tipos_masajes);
    const idiomas = normalizeArray(p.idiomas);
    if (servicios.length)
      groups.push({
        title: "Servicios",
        icon: "star",
        items: toChips(servicios),
      });
    if (sexoOral.length)
      groups.push({
        title: "Sexo Oral",
        icon: "lips",
        items: toChips(sexoOral),
      });
    if (fantasias.length)
      groups.push({
        title: "Fantasias",
        icon: "sparkle",
        items: toChips(fantasias),
      });
    if (virtuales.length)
      groups.push({
        title: "Servicios Virtuales",
        icon: "video",
        items: toChips(virtuales),
      });
    if (masajes.length)
      groups.push({ title: "Masajes", icon: "star", items: toChips(masajes) });
    if (idiomas.length)
      groups.push({ title: "Idiomas", icon: "users", items: toChips(idiomas) });
    return groups;
  }

  if (loading)
    return (
      <main className="vvp-page">
        <div className="vvp-container">
          <p className="vv-form-loading">Cargando...</p>
        </div>
      </main>
    );
  if (!pub)
    return (
      <main className="vvp-page">
        <div className="vvp-container">
          <div className="vv-empty">Perfil no encontrado.</div>
          <Link
            href={`/${category}`}
            className="vv-form-back"
            style={{ display: "block", textAlign: "center" }}
          >
            Volver
          </Link>
        </div>
      </main>
    );

  const nombre = pub.nombre || "Sin nombre";
  const edad = pub.edad || null;
  const zona = pub.zona || pub.ciudad || "";
  const departamento = pub.departamento || "";
  const disponible = mounted
    ? isDisponibleAhora(pub.disponible, pub.ultima_actividad)
    : false;
  const activityLabel = mounted ? getActivityLabel(pub.ultima_actividad) : null;
  const rating = ratingPromedio ?? (pub.rating != null ? pub.rating : 0);
  const planConfig = getPlanConfig(planId);
  const coverImg = fixStorageUrl(pub.cover_url || "");
  const serviceGroups =
    joinServiceGroups !== null
      ? joinServiceGroups
      : buildLegacyServiceGroups(pub);
  const hasWhatsApp =
    !!contactInfo.telefono_whatsapp &&
    contactInfo.telefono_whatsapp.trim().length > 3;
  const hasTelegram =
    !!contactInfo.telegram_username &&
    contactInfo.telegram_username.trim().length > 0;
  const telegramUser = hasTelegram
    ? contactInfo.telegram_username!.replace(/^@/, "")
    : "";
  const showPhone = hasWhatsApp && contactInfo.telefono_visible === true;
  const hasPhone = !!pub.telefono && pub.telefono.trim().length > 3;
  const atiende = normalizeArray(pub.atiende_en);

  return (
    <main className="vvp-page">
      <div className="vvp-container">
        {/* -- Limbo-style Header -- */}
        <div className="vvp-header">
          <div className="vvp-header-top">
            <Link
              href={`/${category}`}
              className="vvp-header-back"
              data-testid="link-back"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="vvp-header-top-actions">
              <button
                className="vvp-header-icon-btn"
                onClick={toggleFav}
                data-testid="button-favorito"
                aria-label="Favorito"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={mounted && isFav ? "#e11d48" : "none"}
                  stroke={mounted && isFav ? "#e11d48" : "currentColor"}
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button
                className="vvp-header-icon-btn"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: nombre,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                data-testid="button-compartir"
                aria-label="Compartir"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>

          <div className="vvp-header-profile">
            <div
              className="vvp-avatarWrap"
              onClick={() => {
                if (userStories.length > 0) setStoryViewerOpen(true);
              }}
              style={{
                cursor:
                  mounted && userStories.length > 0 ? "pointer" : "default",
              }}
            >
              <div
                className={`vvp-avatar-wrapper${mounted && userStories.length > 0 ? ` vvp-avatar-ring vvp-avatar-ring-${planId}` : ""}`}
                data-testid="avatar-profile"
              >
                {coverImg ? (
                  <img src={coverImg} alt={nombre} className="vvp-avatar-img" />
                ) : (
                  <div className="vvp-avatar-placeholder">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" />
                    </svg>
                  </div>
                )}
              </div>
              {mounted && storyPreview && userStories.length > 0 && (
                <div
                  className="vvp-storyBubble"
                  data-testid="story-preview-bubble"
                >
                  <div className="vvp-storyBubbleTitle">
                    {storyPreview.text}
                  </div>
                  <div className="vvp-storyBubbleTime">{storyPreview.time}</div>
                </div>
              )}
            </div>

            <div className="vvp-header-info">
              <div className="vvp-header-name-row">
                <h1 className="vvp-header-name" data-testid="text-nombre">
                  {nombre}
                </h1>
                {disponible ? (
                  <span
                    className="vvp-header-online"
                    data-testid="status-disponible"
                  >
                    <span className="vvp-header-online-dot" />
                  </span>
                ) : pub.disponible && activityLabel ? (
                  <span
                    className="vvp-header-activity"
                    data-testid="status-activity"
                  >
                    {activityLabel}
                  </span>
                ) : null}
              </div>

              <div className="vvp-header-sub">
                {edad && <span data-testid="text-age">{edad} anos</span>}
                {pub.categoria && (
                  <span>
                    {pub.categoria === "mujer"
                      ? "Mujer"
                      : pub.categoria === "hombre"
                        ? "Hombre"
                        : "Trans"}
                  </span>
                )}
              </div>

              {planId !== "free" && (
                <span
                  className="vvp-header-plan-badge"
                  style={{
                    background: planConfig.badge_bg,
                    color: planConfig.badge_text,
                    visibility: mounted ? "visible" : "hidden",
                  }}
                  data-testid="badge-plan"
                >
                  {planConfig.name}
                </span>
              )}

              <div className="vvp-header-details">
                <span className="vvp-header-rating" data-testid="text-rating">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {rating.toFixed(1)}
                </span>
                {pub.altura_cm && (
                  <span className="vvp-header-height">{pub.altura_cm} cm</span>
                )}
              </div>

              <div className="vvp-header-small-actions">
                <button
                  className="vvp-header-small-link"
                  onClick={() => setReportOpen(true)}
                  data-testid="button-reportar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  Reportar
                </button>
                <button
                  className="vvp-header-small-link"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: nombre,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  data-testid="button-compartir-info"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Compartir
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="vvp-contact-btns">
          {hasWhatsApp ? (
            <a
              href={getWhatsAppUrl(contactInfo.telefono_whatsapp!)}
              target="_blank"
              rel="noopener noreferrer"
              className="vvp-twin-btn vvp-twin-wa"
              data-testid="button-whatsapp"
              onClick={() => {
                if (pub.user_id)
                  trackProfileEvent(pub.user_id, "whatsapp_click", {
                    publicacion_id: id,
                  });
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.17-2.87.85.85-2.87-.18-.29A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
              </svg>
              WhatsApp
            </a>
          ) : (
            <button
              className="vvp-twin-btn vvp-twin-wa vvp-twin-disabled"
              disabled
              data-testid="button-whatsapp"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.17-2.87.85.85-2.87-.18-.29A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
              </svg>
              WhatsApp
            </button>
          )}
          {hasTelegram ? (
            <a
              href={getTelegramUrl(telegramUser!)}
              target="_blank"
              rel="noopener noreferrer"
              className="vvp-twin-btn vvp-twin-tg"
              data-testid="button-telegram"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </a>
          ) : (
            <button
              className="vvp-twin-btn vvp-twin-tg vvp-twin-disabled"
              disabled
              data-testid="button-telegram"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
              >
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </button>
          )}
        </div>

        {contactInfo.video_disponible && hasWhatsApp && (
          <a
            href={getWhatsAppVideoUrl(contactInfo.telefono_whatsapp!)}
            target="_blank"
            rel="noopener noreferrer"
            className="vvp-video-badge vvp-video-badge-link"
            data-testid="badge-videollamada"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Disponible por videollamada</span>
          </a>
        )}

        {contactInfo.video_disponible && !hasWhatsApp && (
          <div className="vvp-video-badge" data-testid="badge-videollamada">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="16"
              height="16"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <span>Disponible por videollamada</span>
          </div>
        )}

        <div className="vvp-data-rows" data-testid="data-rows">
          {showPhone && (
            <div className="vvp-data-row" data-testid="data-telefono">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <span className="vvp-data-label">Telefono</span>
              <span className="vvp-data-value">
                {formatPhone(contactInfo.telefono_whatsapp!)}
              </span>
            </div>
          )}
          {zona && (
            <div className="vvp-data-row" data-testid="data-ubicacion">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 21s-7-5.3-7-10a7 7 0 1114 0c0 4.7-7 10-7 10z" />
                <circle cx="12" cy="11" r="2" />
              </svg>
              <span className="vvp-data-label">Ubicacion</span>
              <span className="vvp-data-value">
                {zona}
                {departamento ? `, ${departamento}` : ""}
              </span>
            </div>
          )}
          {(() => {
            const safeTarifas = (v: unknown): Record<string, number | null> => {
              if (v && typeof v === "object" && !Array.isArray(v))
                return v as Record<string, number | null>;
              if (typeof v === "string") {
                try {
                  const p2 = JSON.parse(v);
                  if (p2 && typeof p2 === "object") return p2;
                } catch {}
              }
              return {};
            };
            const tarifasIcon = (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            );
            const t = safeTarifas(pub.tarifas);
            const parts: string[] = [];
            if (t.hora1 != null && t.hora1 !== 0) parts.push(`1 h $${t.hora1}`);

            if (t.min30 != null && t.min30 !== 0)
              parts.push(`30 min $${t.min30}`);

            if (t.min15 != null && t.min15 !== 0)
              parts.push(`15 min $${t.min15}`);

            let valorText = "Consultar por WhatsApp";
            if (pub.consultar_precio) {
              valorText = "Consultar por WhatsApp";
            } else if (parts.length > 0) {
              valorText = parts.join(" | ");
            } else if (pub.tarifa_hora) {
              valorText = `$${pub.tarifa_hora}${pub.acepta_usd ? " (USD)" : ""} /hora`;
            }

            return (
              <div className="vvp-data-row" data-testid="data-tarifa">
                {tarifasIcon}
                <span className="vvp-data-label">Tarifa</span>
                <span className="vvp-data-value">{valorText}</span>
              </div>
            );
          })()}
          {atiende.length > 0 && (
            <div className="vvp-data-row" data-testid="data-atiende-en">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="vvp-data-label">Atiende en</span>
              <span className="vvp-data-value">{atiende.join(", ")}</span>
            </div>
          )}
          {pub.atiende_a && pub.atiende_a.length > 0 && (
            <div className="vvp-data-row" data-testid="data-atiende-a">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="vvp-data-label">Atiende a</span>
              <span className="vvp-data-value">
                {pub.atiende_a
                  .map((v) =>
                    v === "Hombre" ? "Hombres" : v === "Mujer" ? "Mujeres" : v,
                  )
                  .join(", ")}
              </span>
            </div>
          )}
          {pub.horarios && (
            <div className="vvp-data-row" data-testid="data-horarios">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="vvp-data-label">Horarios</span>
              <span className="vvp-data-value">{pub.horarios}</span>
            </div>
          )}
        </div>

        <VerificationBadge verified={isVerified} />

        <div className="vvp-tabs" ref={tabsRef}>
          {(["principal", "servicios", "opiniones"] as TabId[]).map((tab) => (
            <button
              key={tab}
              className={`vvp-tab ${activeTab === tab ? "vvp-tab-active" : ""}`}
              onClick={() => scrollToSection(tab)}
              data-testid={`tab-${tab}`}
            >
              {tab === "principal"
                ? "Principal"
                : tab === "servicios"
                  ? "Servicios"
                  : "Opiniones"}
            </button>
          ))}
        </div>

        <div ref={principalRef} className="vvp-section" id="section-principal">
          <h2 className="vvp-section-title">Presentacion</h2>
          <p className="vvp-presentacion">
            {pub.descripcion || "Consulta por WhatsApp para mas informacion."}
          </p>

          {(() => {
            const asArr = (v: unknown): string[] => {
              if (Array.isArray(v)) return v.filter(Boolean);
              if (typeof v === "string") {
                try {
                  const p = JSON.parse(v);
                  if (Array.isArray(p)) return p.filter(Boolean);
                } catch {}
              }
              return [];
            };
            const allFotos: string[] =
              asArr(pub.fotos).length > 0
                ? asArr(pub.fotos)
                : coverImg
                  ? [coverImg]
                  : [];
            const allVideos: string[] = asArr(pub.videos);
            const mediaItems: MediaItem[] = [
              ...allFotos.map(
                (url): MediaItem => ({
                  type: "image",
                  url: fixStorageUrl(url),
                }),
              ),
              ...allVideos.map(
                (url): MediaItem => ({
                  type: "video",
                  url: fixStorageUrl(url),
                }),
              ),
            ];
            return (
              <>
                <h2 className="vvp-section-title" style={{ marginTop: 24 }}>
                  Galeria
                </h2>
                {mediaItems.length > 0 ? (
                  <VerticalGallery mediaItems={mediaItems} />
                ) : (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.85rem",
                    }}
                  >
                    Aun no hay medios cargados.
                  </p>
                )}
              </>
            );
          })()}

          <div className="vvp-social-section">
            <h2 className="vvp-section-title">Mis redes sociales</h2>
            <div className="vvp-social-row">
              {(
                [
                  {
                    key: "instagram_url" as const,
                    label: "Instagram",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 011.47.958c.458.458.779.91.958 1.47.163.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 01-.958 1.47 4.088 4.088 0 01-1.47.958c-.46.163-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 01-1.47-.958 4.088 4.088 0 01-.958-1.47c-.163-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43a4.088 4.088 0 01.958-1.47 4.088 4.088 0 011.47-.958c.46-.163 1.26-.35 2.43-.404C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a6.21 6.21 0 00-2.245 1.462A6.21 6.21 0 00.433 4.337C.136 5.1-.066 5.973.007 7.251.07 8.53.056 8.939.056 12.198c0 3.259.014 3.668.072 4.948.059 1.277.261 2.15.558 2.913a6.21 6.21 0 001.462 2.245 6.21 6.21 0 002.245 1.462c.762.297 1.636.499 2.913.558C8.53 24.383 8.939 24.397 12.198 24.397c3.259 0 3.668-.014 4.948-.072 1.277-.059 2.15-.261 2.913-.558a6.21 6.21 0 002.245-1.462 6.21 6.21 0 001.462-2.245c.297-.762.499-1.636.558-2.913.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.059-1.277-.261-2.15-.558-2.913a6.21 6.21 0 00-1.462-2.245A6.21 6.21 0 0019.86.433C19.098.136 18.224-.066 16.947.007 15.668.07 15.259.056 12 .056zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-10.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
                      </svg>
                    ),
                  },
                  {
                    key: "onlyfans_url" as const,
                    label: "OnlyFans",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.667a6.667 6.667 0 110-13.334 6.667 6.667 0 010 13.334zm0-10.667a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    ),
                  },
                  {
                    key: "twitter_url" as const,
                    label: "Twitter / X",
                    svg: (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                ] as const
              ).map(({ key, label, svg }) => {
                const url = socialLinks[key];
                const hasUrl = !!url && url.trim().length > 0;
                return hasUrl ? (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vvp-social-icon vvp-social-active"
                    data-testid={`social-${key}`}
                  >
                    {svg}
                    <span>{label}</span>
                  </a>
                ) : (
                  <span
                    key={key}
                    className="vvp-social-icon vvp-social-disabled"
                    data-testid={`social-${key}`}
                  >
                    {svg}
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={serviciosRef} className="vvp-section" id="section-servicios">
          {serviceGroups.length > 0 ? (
            <>
              <h2 className="vvp-section-title">Servicios</h2>
              {serviceGroups.map((group) => (
                <div key={group.title} className="vvp-service-group">
                  <h3 className="vvp-service-group-title">
                    <ServiceIcon icon={group.icon} />
                    {group.title}
                  </h3>
                  <div className="vvp-chips">
                    {group.items.map((chip) => {
                      const chipSlug = chip.id
                        ? makeServiceSlug(chip.nombre, chip.id)
                        : slugify(chip.nombre);
                      return (
                        <Link
                          key={`${slugify(group.title)}-${chip.id ?? slugify(chip.nombre)}`}
                          href={`/servicios/${chipSlug}?cat=${category}`}
                          className="vvp-chip vvp-chip-link"
                          data-testid={`chip-link-${slugify(chip.nombre)}`}
                        >
                          {chip.nombre}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <h2 className="vvp-section-title">Servicios</h2>
              <p className="vvp-no-services">
                Consulta por WhatsApp para mas informacion sobre servicios.
              </p>
            </>
          )}
        </div>

        <div ref={opinionesRef} className="vvp-section" id="section-opiniones">
          <h2 className="vvp-section-title">Opiniones</h2>

          <div className="vvp-comment-form">
            <div className="vvp-rating-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setCommentRating(star)}
                  className="vvp-star-btn"
                  aria-label={`${star} estrellas`}
                  data-testid={`star-${star}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={star <= commentRating ? "#c6a75e" : "none"}
                    stroke="#c6a75e"
                    strokeWidth="2"
                    className="vvp-star-select"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
              {commentRating > 0 && (
                <span className="vvp-rating-label">{commentRating}/5</span>
              )}
            </div>
            <textarea
              className="vvp-comment-input"
              placeholder="Escribe tu opinion (minimo 5 caracteres)..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              maxLength={500}
              data-testid="input-comment"
            />
            <div className="vvp-opinion-inputs">
              {!commentAnonimo && (
                <input
                  type="text"
                  className="vvp-nombre-input"
                  placeholder="Tu nombre (opcional)"
                  value={commentNombre}
                  onChange={(e) => setCommentNombre(e.target.value)}
                  maxLength={40}
                  data-testid="input-comment-nombre"
                />
              )}
              <label className="vvp-anonimo-label">
                <input
                  type="checkbox"
                  checked={commentAnonimo}
                  onChange={(e) => setCommentAnonimo(e.target.checked)}
                  data-testid="checkbox-anonimo"
                />
                Anonimo
              </label>
              <button
                className="vvp-comment-submit"
                onClick={handleComment}
                disabled={commentSending || commentText.trim().length < 5 || commentRating < 1}
                data-testid="button-comment-submit"
              >
                {commentSending ? "Enviando..." : "Publicar"}
              </button>
            </div>
          </div>

          {comments.length > 0 ? (
            <div className="vvp-comments-list">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="vvp-comment-item"
                  data-testid={`comment-${c.id}`}
                >
                  <div className="vvp-comment-header">
                    <span className="vvp-comment-avatar">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="7" r="4" />
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      </svg>
                    </span>
                    <span className="vvp-comment-author">
                      {c.autor || "Anonimo"}
                    </span>
                    {c.rating != null && c.rating > 0 && (
                      <span
                        className="vvp-comment-rating"
                        data-testid={`rating-${c.id}`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            viewBox="0 0 24 24"
                            fill={i < c.rating! ? "#c6a75e" : "none"}
                            stroke="#c6a75e"
                            strokeWidth="2"
                            className="vvp-star-icon"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </span>
                    )}
                    <span className="vvp-comment-date">
                      {new Date(c.created_at).toLocaleDateString("es-UY", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="vvp-comment-text">{c.comentario}</p>
                  {c.respuesta && (
                    <div style={{
                      marginTop: 8,
                      paddingLeft: 12,
                      borderLeft: "2px solid rgba(198,167,94,0.3)",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)" }}>
                        Respuesta
                      </span>
                      {c.respondida_at && (
                        <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginLeft: 8 }}>
                          {new Date(c.respondida_at).toLocaleDateString("es-UY", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.4 }}>
                        {c.respuesta}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="vvp-opiniones-empty">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>Aun no hay opiniones</p>
            </div>
          )}
        </div>

        <ApproxMapEmbed
          zona={pub.zona}
          ciudad={pub.ciudad}
          departamento={pub.departamento}
        />
        {children}

        <div style={{ height: 90 }} />
      </div>

      {hasWhatsApp && (
        <WhatsAppButton
          href={getWhatsAppUrl(contactInfo.telefono_whatsapp!)}
          onClick={() => {
            if (pub.user_id)
              trackProfileEvent(pub.user_id, "whatsapp_click", {
                publicacion_id: id,
              });
          }}
        />
      )}

      {showScrollTop && (
        <button
          className="vvp-scroll-top"
          onClick={scrollToTop}
          data-testid="button-scroll-top"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}

      {reportOpen && (
        <div
          className="vvp-modal-overlay"
          onClick={() => !reportSending && setReportOpen(false)}
        >
          <div
            className="vvp-modal"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-report"
          >
            <h3 className="vvp-modal-title">Reportar perfil</h3>
            {reportSent ? (
              <div className="vvp-report-sent">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <p>Reporte enviado</p>
              </div>
            ) : (
              <>
                <div className="vv-field">
                  <label className="vv-label">Motivo</label>
                  <select
                    className="vv-input"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    data-testid="select-report-reason"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="vv-field" style={{ marginTop: 12 }}>
                  <label className="vv-label">Detalles (opcional)</label>
                  <textarea
                    className="vv-textarea"
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Describe el problema..."
                    data-testid="input-report-details"
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    className="vv-btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setReportOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="vv-btn"
                    style={{ flex: 1, marginTop: 0 }}
                    onClick={handleReport}
                    disabled={reportSending}
                    data-testid="button-report-submit"
                  >
                    {reportSending ? "Enviando..." : "Enviar reporte"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {storyViewerOpen && userStories.length > 0 && (
        <StoryViewer
          stories={userStories}
          initialIndex={0}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}
    </main>
  );
}

function ServiceIcon({ icon }: { icon: string }) {
  if (icon === "users")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  if (icon === "star")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  if (icon === "lips")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      </svg>
    );
  if (icon === "sparkle")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3v1m0 16v1m-7.07-2.93l.7-.7M18.36 5.64l.7-.7M3 12h1m16 0h1M5.64 5.64l.7.7M17.66 17.66l.7.7" />
      </svg>
    );
  if (icon === "video")
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="7" width="15" height="10" rx="2" />
        <path d="M17 9l5-3v12l-5-3" />
      </svg>
    );
  return null;
}

function normalizeArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v))
    return v
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith("{") && s.endsWith("}")) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return [];
      const out: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        if (ch === "," && !inQuotes) {
          const t = cur.trim();
          if (t) out.push(t);
          cur = "";
          continue;
        }
        cur += ch;
      }
      const t = cur.trim();
      if (t) out.push(t);
      return out.map((x) => x.trim()).filter(Boolean);
    }
    return [s];
  }
  return [];
}
