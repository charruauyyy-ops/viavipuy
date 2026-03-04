"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import { getPlanConfig } from "@/lib/plans";
import { fixStorageUrl } from "@/lib/fixStorageUrl";
import MediaGallery from "@/app/components/MediaGallery";
import FotosPreviewEditor from "@/app/components/FotosPreviewEditor";
import { updateDisponible } from "@/lib/pingActividad";
import { useHeartbeat } from "@/hooks/useHeartbeat";

interface ProfileData {
  verification_status?: string;
  plan_actual?: string;
  plan_estado?: string;
  paid_until?: string;
  plan_expires_at?: string;
  trial_ends_at?: string;
  verified_at?: string;
  categoria?: string;
  nombre?: string;
  doc_frente_url?: string;
  doc_dorso_url?: string;
  selfie_url?: string;
}

interface PubData {
  id: string;
  nombre?: string;
  edad?: number;
  descripcion?: string;
  cover_url?: string;
  zona?: string;
  ciudad?: string;
  disponible?: boolean;
  rating?: number;
  telefono?: string;
  fotos?: string[];
  fotos_preview?: string[];
  videos?: string[];
  video_preview_url?: string | null;
  tarifas?: Record<string, number | null> | string | null;
  consultar_precio?: boolean;
  precio?: number | null;
  mostrar_precio?: boolean;
  servicios?: string[];
  fantasias?: string[];
  servicios_virtuales?: string[];
  tipos_masajes?: string[];
  idiomas?: string[];
  estado?: string;
  expires_at?: string;
}

const CATEGORIA_ORDER = [
  "servicios",
  "sexo_oral",
  "fantasias",
  "virtuales",
  "masajes",
  "idiomas",
] as const;

const CATEGORIA_TITLES: Record<string, string> = {
  servicios: "Servicios",
  sexo_oral: "Sexo oral",
  fantasias: "Fantasias",
  virtuales: "Servicios Virtuales",
  masajes: "Tipos de Masajes",
  idiomas: "Idiomas",
};

const DB_CAT_TO_PUB_FIELD: Record<string, string> = {
  servicios: "servicios",
  sexo_oral: "sexo_oral",
  fantasias: "fantasias",
  virtuales: "servicios_virtuales",
  masajes: "tipos_masajes",
  idiomas: "idiomas",
};

function ChipEditor({
  fieldLabel,
  options,
  selected,
  onChange,
  testPrefix,
}: {
  fieldLabel: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  testPrefix: string;
}) {
  function toggle(val: string) {
    onChange(
      selected.includes(val)
        ? selected.filter((s) => s !== val)
        : [...selected, val],
    );
  }
  return (
    <div className="vv-chip-edit-group">
      <label className="vv-label" style={{ marginBottom: 6 }}>
        {fieldLabel}
      </label>
      <div className="vv-chip-selector">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`vv-chip-option ${selected.includes(opt) ? "vv-chip-option-selected" : ""}`}
            onClick={() => toggle(opt)}
            data-testid={`${testPrefix}-${opt.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MiCuentaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [pagoDuracion, setPagoDuracion] = useState<number>(30);
  const [processingPago, setProcessingPago] = useState(false);

  // Pago manual (publicación) - sin redirecciones
  const [manualPagoId, setManualPagoId] = useState<string | null>(null);
  const [manualMetodo, setManualMetodo] = useState<
    "abitab" | "redpagos" | "transferencia" | null
  >(null);
  const [manualComprobanteOk, setManualComprobanteOk] = useState(false);
  const [manualUploadLoading, setManualUploadLoading] = useState(false);
  const [manualMsg, setManualMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function manualInstrucciones(m: "abitab" | "redpagos" | "transferencia") {
    if (m === "abitab")
      return [
        "Acercate a cualquier local Abitab",
        "Indica que queres hacer un pago a Jonathan Semelman",
        "Cedula 37884659",
        "Guardá el comprobante y subilo acá.",
      ];
    if (m === "redpagos")
      return [
        "Acercate a cualquier local RedPagos",
        "Indica que queres hacer un pago a Jonathan Semelman",
        "Cedula 37884659",

        "Guardá el comprobante y subilo acá.",
      ];
    return [
      "Realiza una transferencia a la cuenta Prex:",
      "Cuenta: 21657689",
      "Nombre: Jonathan Semelman",
      ,
      "Guardá el comprobante y subilo acá.",
    ];
  }

  async function subirComprobanteManual(pagoId: string) {
    if (!fileInputRef.current?.files?.[0]) {
      setManualMsg("Seleccioná un archivo primero.");
      return;
    }
    setManualUploadLoading(true);
    setManualMsg(null);

    try {
      const supabase = getSupabase();
      const { data: session } = await supabase!.auth.getSession();
      const token = session?.session?.access_token;

      const formData = new FormData();
      formData.append("pago_id", pagoId);
      formData.append("comprobante", fileInputRef.current.files[0]);

      const res = await fetch("/api/pagos/comprobante", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();
      if (data.ok) {
        setManualComprobanteOk(true);
        setManualMsg("Comprobante enviado. Queda en revisión.");
      } else {
        setManualMsg(data.error || "Error al subir comprobante");
      }
    } catch (e) {
      setManualMsg("Error de conexión");
    } finally {
      setManualUploadLoading(false);
    }
  }

  async function handlePagarPublicacion(
    metodo: "mercadopago" | "abitab" | "redpagos" | "transferencia",
  ) {
    if (!pub || !userId) return;
    setProcessingPago(true);

    try {
      const pubMonto =
        pagoDuracion === 30 ? 250 : pagoDuracion === 60 ? 500 : 750;
      const supabase = getSupabase();
      const { data: session } = await supabase!.auth.getSession();
      const token = session?.session?.access_token;

      if (metodo === "mercadopago") {
        const res = await fetch("/api/pagos/mercadopago", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tipo: "publicacion",
            publicacion_id: pub.id,
            publicacion_duracion_dias: pagoDuracion,
            publicacion_monto: pubMonto,
          }),
        });
        const data = await res.json();
        if (data.init_point) {
          window.location.href = data.init_point;
          return;
        }
        alert(data.error || "Error al iniciar pago");
      } else {
        const res = await fetch("/api/pagos/crear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tipo: "publicacion",
            metodo_pago: metodo,
            publicacion_id: pub.id,
            publicacion_duracion_dias: pagoDuracion,
            publicacion_monto: pubMonto,
          }),
        });
        const data = await res.json();
        if (data.pago_id) {
          // No redirigir: mantener flujo manual dentro de /mi-cuenta
          setManualPagoId(data.pago_id);
          setManualMetodo(metodo);
          setManualComprobanteOk(false);
          setManualMsg(null);
        } else {
          alert(data.error || "Error al crear pago");
        }
      }
    } catch (e) {
      alert("Error de conexion");
    } finally {
      setProcessingPago(false);
    }
  }

  const [authError, setAuthError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  const [pub, setPub] = useState<PubData | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<Record<string, string[]>>({
    servicios: [],
    sexo_oral: [],
    fantasias: [],
    servicios_virtuales: [],
    tipos_masajes: [],
    idiomas: [],
  });
  const [saving, setSaving] = useState(false);
  const [serviciosCatalog, setServiciosCatalog] = useState<
    Record<string, string[]>
  >({});
  const [serviciosLoading, setServiciosLoading] = useState(false);
  const [serviciosError, setServiciosError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editingTags, setEditingTags] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [onlyfansUrl, setOnlyfansUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialMsg, setSocialMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telefonoVisible, setTelefonoVisible] = useState(false);
  const [videoDisponible, setVideoDisponible] = useState(false);
  const [tarifaMin15, setTarifaMin15] = useState("");
  const [tarifaMin30, setTarifaMin30] = useState("");
  const [tarifaHora1, setTarifaHora1] = useState("");
  const [consultarPrecio, setConsultarPrecio] = useState(false);
  const [precioCard, setPrecioCard] = useState("");
  const [mostrarPrecio, setMostrarPrecio] = useState(false);
  const [savingTarifas, setSavingTarifas] = useState(false);
  const [tarifasMsg, setTarifasMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [disponibleSwitch, setDisponibleSwitch] = useState(false);
  const [togglingDisp, setTogglingDisp] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  interface OpinionItem {
    id: string;
    comentario: string;
    rating: number;
    autor: string;
    status: string;
    created_at: string;
    respuesta: string | null;
    respondida_at: string | null;
  }
  const [opiniones, setOpiniones] = useState<OpinionItem[]>([]);
  const [opinionesLoading, setOpinionesLoading] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingSaving, setReplyingSaving] = useState<string | null>(null);
  const [deletingOpinion, setDeletingOpinion] = useState<string | null>(null);

  useHeartbeat(!!userId && !!pub && disponibleSwitch);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchCatalog() {
      const supabase = getSupabase();
      if (!supabase) return;
      setServiciosLoading(true);
      setServiciosError(null);
      const { data, error } = await supabase
        .from("servicios")
        .select("nombre,categoria")
        .order("categoria")
        .order("nombre");
      if (error) {
        setServiciosError(error.message);
        setServiciosLoading(false);
        return;
      }
      const grouped: Record<string, string[]> = {};
      for (const row of data || []) {
        const cat = row.categoria;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(row.nombre);
      }
      setServiciosCatalog(grouped);
      setServiciosLoading(false);
    }
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (!userId || !mounted) return;
    async function getNotifs() {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
        const { data, error } = await supabase.rpc(
          "notificaciones_unread_count",
        );
        if (!error && typeof data === "number") {
          setNotifCount(data);
        }
      } catch (e) {
        console.error("Error fetching notifications:", e);
      }
    }
    getNotifs();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        getNotifs();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [userId, mounted]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      if (!supabase) {
        setAuthError("Supabase no configurado.");
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        setAuthError("Inicia sesion para ver tu cuenta.");
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || "");
      const { data: profRows, error: profErr } = await supabase
        .from("profiles")
        .select(
          "verification_status, plan_actual, plan_estado, paid_until, plan_expires_at, trial_ends_at, verified_at, categoria, nombre, doc_frente_url, doc_dorso_url, selfie_url, instagram_url, onlyfans_url, twitter_url, email_confirmed, telefono_whatsapp, telegram_username, telefono_visible, video_disponible",
        )
        .eq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (profErr) {
        console.error("Error fetching profile:", JSON.stringify(profErr));
      }

      const prof = profRows && profRows.length > 0 ? profRows[0] : null;
      const profileData = (prof as ProfileData) || {};
      setProfile(profileData);

      const emailConfirmedByAuth = !!(
        user.email_confirmed_at ||
        (user as unknown as Record<string, unknown>).confirmed_at
      );
      const emailConfirmedByProfile = !!(
        prof as unknown as Record<string, unknown>
      )?.email_confirmed;
      setEmailConfirmed(emailConfirmedByAuth || emailConfirmedByProfile);

      if (prof) {
        const p = prof as Record<string, unknown>;
        setInstagramUrl((p.instagram_url as string) || "");
        setOnlyfansUrl((p.onlyfans_url as string) || "");
        setTwitterUrl((p.twitter_url as string) || "");
        setTelefonoWhatsapp((p.telefono_whatsapp as string) || "");
        setTelegramUsername((p.telegram_username as string) || "");
        setTelefonoVisible(!!p.telefono_visible);
        setVideoDisponible(!!p.video_disponible);
      }

      const { data: pubData } = await supabase
        .from("publicaciones")
        .select(
          "id, nombre, edad, descripcion, cover_url, zona, ciudad, disponible, disponible_manual, rating, telefono, fotos, fotos_preview, videos, video_preview_url, tarifas, consultar_precio, precio, mostrar_precio, servicios, sexo_oral, fantasias, servicios_virtuales, tipos_masajes, idiomas, estado, expires_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pubData) {
        const p = pubData as PubData;
        setPub(p);
        const asArr = (v: unknown): string[] => {
          if (Array.isArray(v)) return v.filter(Boolean);
          if (typeof v === "string") {
            try {
              const parsed = JSON.parse(v);
              if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch {}
          }
          return [];
        };
        setFotos(asArr(p.fotos));
        setFotosPreview(asArr(p.fotos_preview));
        setVideos(asArr(p.videos));
        setVideoPreviewUrl(p.video_preview_url || "");
        const safeTarifas = (v: unknown): Record<string, number | null> => {
          if (v && typeof v === "object" && !Array.isArray(v))
            return v as Record<string, number | null>;
          if (typeof v === "string") {
            try {
              const parsed = JSON.parse(v);
              if (parsed && typeof parsed === "object") return parsed;
            } catch {}
          }
          return {};
        };
        const t = safeTarifas(p.tarifas);
        setTarifaMin15(t.min15 != null ? String(t.min15) : "");
        setTarifaMin30(t.min30 != null ? String(t.min30) : "");
        setTarifaHora1(t.hora1 != null ? String(t.hora1) : "");
        setConsultarPrecio(!!p.consultar_precio);
        setPrecioCard(p.precio != null ? String(p.precio) : "");
        setMostrarPrecio(!!p.mostrar_precio);
        setCoverUrl(p.cover_url || "");
        setDisponibleSwitch(
          (p as any).disponible_manual != null
            ? !!(p as any).disponible_manual
            : p.disponible !== false,
        );
        setTags({
          servicios: asArr(p.servicios),
          sexo_oral: asArr((p as any).sexo_oral),
          fantasias: asArr(p.fantasias),
          servicios_virtuales: asArr(p.servicios_virtuales),
          tipos_masajes: asArr(p.tipos_masajes),
          idiomas: asArr(p.idiomas),
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!pub) return;
    async function fetchOpiniones() {
      setOpinionesLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setOpinionesLoading(false);
        return;
      }
      const { data } = await supabase
        .from("opiniones")
        .select(
          "id, comentario, rating, autor, status, created_at, respuesta, respondida_at",
        )
        .eq("publicacion_id", pub!.id)
        .order("created_at", { ascending: false });
      setOpiniones((data || []) as OpinionItem[]);
      setOpinionesLoading(false);
    }
    fetchOpiniones();
  }, [pub]);

  async function handleReplyOpinion(opinionId: string) {
    const text = (replyDrafts[opinionId] || "").trim();
    if (!text) return;
    setReplyingSaving(opinionId);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/opiniones/${opinionId}/responder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ respuesta: text }),
      });
      if (res.ok) {
        setOpiniones((prev) =>
          prev.map((o) =>
            o.id === opinionId
              ? {
                  ...o,
                  respuesta: text,
                  respondida_at: new Date().toISOString(),
                }
              : o,
          ),
        );
        setReplyDrafts((d) => {
          const n = { ...d };
          delete n[opinionId];
          return n;
        });
      }
    } finally {
      setReplyingSaving(null);
    }
  }

  async function handleDeleteOpinion(opinionId: string) {
    if (!confirm("Eliminar esta opinion?")) return;
    setDeletingOpinion(opinionId);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/opiniones/${opinionId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setOpiniones((prev) => prev.filter((o) => o.id !== opinionId));
      }
    } finally {
      setDeletingOpinion(null);
    }
  }

  async function handleResendVerification() {
    const supabase = getSupabase();
    if (!supabase || !userEmail) return;
    setResending(true);
    setResendMsg(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmail,
      });
      setResendMsg(
        error
          ? "Error: " + error.message
          : "Email reenviado. Revisa tu bandeja de entrada.",
      );
    } catch {
      setResendMsg("No se pudo reenviar el email.");
    }
    setResending(false);
  }

  async function handleSaveMedia() {
    if (!userId) return;
    setSaving(true);
    setSaveMsg(null);

    const supabase = getSupabase();
    if (!supabase) {
      setSaving(false);
      return;
    }

    const uniq = (arr: string[]) =>
      Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean)));

    let targetPubId = pub?.id;
    if (!targetPubId) {
      const { data: latestPub } = await supabase
        .from("publicaciones")
        .select("id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestPub) {
        setSaveMsg({ type: "error", text: "Primero crea una publicacion." });
        setSaving(false);
        return;
      }
      targetPubId = latestPub.id;
    }

    const serviciosFinal = uniq([
      ...tags.servicios,
      ...tags.sexo_oral,
      ...tags.fantasias,
      ...tags.servicios_virtuales,
      ...tags.tipos_masajes,
    ]);
    if (
      tags.servicios_virtuales.length > 0 &&
      !serviciosFinal.includes("Virtual")
    ) {
      serviciosFinal.push("Virtual");
    }

    const payload: Record<string, unknown> = {
      fotos: fotos.filter(Boolean),
      videos: videos.filter(Boolean),
      cover_url: coverUrl || null,
      video_preview_url: videoPreviewUrl || null,
      servicios: serviciosFinal,
      sexo_oral: uniq(tags.sexo_oral),
      fantasias: uniq(tags.fantasias),
      servicios_virtuales: uniq(tags.servicios_virtuales),
      tipos_masajes: uniq(tags.tipos_masajes),
      idiomas: uniq(tags.idiomas),
    };

    const { error } = await supabase
      .from("publicaciones")
      .update(payload)
      .eq("id", targetPubId)
      .eq("user_id", userId);

    if (error) {
      const hint = error.message.includes("column")
        ? " (Es posible que falte ejecutar la migracion SQL en Supabase)"
        : "";
      setSaveMsg({ type: "error", text: `Error: ${error.message}${hint}` });
    } else {
      setSaveMsg({ type: "success", text: "Cambios guardados." });

      const { data: refreshed } = await supabase
        .from("publicaciones")
        .select(
          "id, nombre, edad, descripcion, cover_url, zona, ciudad, disponible, disponible_manual, rating, telefono, fotos, fotos_preview, videos, video_preview_url, tarifas, consultar_precio, precio, mostrar_precio, servicios, sexo_oral, fantasias, servicios_virtuales, tipos_masajes, idiomas, estado, expires_at",
        )
        .eq("id", targetPubId)
        .eq("user_id", userId)
        .maybeSingle();

      if (refreshed) {
        const p = refreshed as PubData;
        setPub(p);
        const asArr = (v: unknown): string[] => {
          if (Array.isArray(v)) return v.filter(Boolean);
          if (typeof v === "string") {
            try {
              const parsed = JSON.parse(v);
              if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch {}
          }
          return [];
        };
        setFotos(asArr(p.fotos));
        setVideos(asArr(p.videos));
        setCoverUrl(p.cover_url || "");
        setVideoPreviewUrl(p.video_preview_url || "");
        setTags({
          servicios: asArr(p.servicios),
          sexo_oral: asArr((p as any).sexo_oral),
          fantasias: asArr(p.fantasias),
          servicios_virtuales: asArr(p.servicios_virtuales),
          tipos_masajes: asArr(p.tipos_masajes),
          idiomas: asArr(p.idiomas),
        });
      }
    }
    setSaving(false);
  }

  function normalizeUrl(val: string): string | null {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return "https://" + trimmed;
  }

  async function handleSaveSocial() {
    if (!userId) return;
    setSavingSocial(true);
    setSocialMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setSavingSocial(false);
      return;
    }

    const payload = {
      instagram_url: normalizeUrl(instagramUrl),
      onlyfans_url: normalizeUrl(onlyfansUrl),
      twitter_url: normalizeUrl(twitterUrl),
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      const hint = error.message.includes("column")
        ? " (Ejecuta la migracion SQL para agregar las columnas)"
        : "";
      setSocialMsg({ type: "error", text: `Error: ${error.message}${hint}` });
    } else {
      setSocialMsg({ type: "success", text: "Redes sociales guardadas." });
      setInstagramUrl(payload.instagram_url || "");
      setOnlyfansUrl(payload.onlyfans_url || "");
      setTwitterUrl(payload.twitter_url || "");
    }
    setSavingSocial(false);
  }

  async function handleSaveContact() {
    if (!userId) return;
    setSavingContact(true);
    setContactMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setSavingContact(false);
      return;
    }

    const cleanTelegram = telegramUsername.trim().replace(/^@/, "");
    const payload = {
      telefono_whatsapp: telefonoWhatsapp.trim() || null,
      telegram_username: cleanTelegram || null,
      telefono_visible: telefonoVisible,
      video_disponible: videoDisponible,
    };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (!error) {
      await supabase
        .from("publicaciones")
        .update({
          telefono_whatsapp: payload.telefono_whatsapp,
          telegram_username: payload.telegram_username,
          telefono_visible: payload.telefono_visible,
          video_disponible: payload.video_disponible,
        })
        .eq("user_id", userId);
    }

    if (error) {
      setContactMsg({ type: "error", text: `Error: ${error.message}` });
    } else {
      setContactMsg({ type: "success", text: "Contacto guardado." });
    }
    setSavingContact(false);
  }

  async function handleSaveTarifas() {
    if (!pub || !userId) return;
    setSavingTarifas(true);
    setTarifasMsg(null);
    const supabase = getSupabase();
    if (!supabase) {
      setSavingTarifas(false);
      return;
    }

    const tarifasPayload: Record<string, number | null> = {};
    if (tarifaMin15.trim()) tarifasPayload.min15 = Number(tarifaMin15);
    if (tarifaMin30.trim()) tarifasPayload.min30 = Number(tarifaMin30);
    if (tarifaHora1.trim()) tarifasPayload.hora1 = Number(tarifaHora1);

    const { error } = await supabase
      .from("publicaciones")
      .update({
        tarifas: tarifasPayload,
        consultar_precio: consultarPrecio,
        precio: precioCard.trim() ? Number(precioCard) : null,
        mostrar_precio: mostrarPrecio,
      })
      .eq("id", pub.id)
      .eq("user_id", userId);

    if (error) {
      setTarifasMsg({ type: "error", text: `Error: ${error.message}` });
    } else {
      setTarifasMsg({ type: "success", text: "Tarifas guardadas." });
    }
    setSavingTarifas(false);
  }

  async function handleToggleDisponible(value: boolean) {
    setTogglingDisp(true);
    setDisponibleSwitch(value);
    const ok = await updateDisponible(value);
    if (!ok) {
      setDisponibleSwitch(!value);
    }
    setTogglingDisp(false);
  }

  async function handleSavePreview(newPreview: string[]) {
    if (!pub || !userId) return;
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase no inicializado.");
    const { error } = await supabase
      .from("publicaciones")
      .update({ fotos_preview: newPreview })
      .eq("id", pub.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }

  async function handleLogout() {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
  }

  if (loading)
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <p className="vv-form-loading">Cargando...</p>
        </div>
      </main>
    );
  if (authError)
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-error-box">{authError}</div>
          <a href="/login" className="vv-form-link">
            Ir a Login
          </a>
        </div>
      </main>
    );

  const planId = profile?.plan_actual || "free";
  const planConfig = getPlanConfig(planId);
  const planEstado = profile?.plan_estado || "sin_plan";
  const planFinRaw = profile?.plan_expires_at || profile?.paid_until;
  const planFin = planFinRaw ? new Date(planFinRaw) : null;
  const isExpired = planFin ? planFin < new Date() : false;
  const verificado = profile?.verification_status === "approved";
  const identidadCompleta = !!(
    profile?.doc_frente_url &&
    profile?.doc_dorso_url &&
    profile?.selfie_url
  );
  const hasPub = !!pub;

  const estadoLabel: Record<string, string> = {
    activo: "Activo",
    vencido: "Vencido",
    cancelado: "Cancelado",
    sin_plan: "Sin plan",
  };

  const catRoute =
    profile?.categoria === "hombre"
      ? "/hombres"
      : profile?.categoria === "trans"
        ? "/trans"
        : "/mujeres";

  function getExpiryState(dateString: string | null | undefined) {
    if (!dateString) return { status: "none" };
    const now = new Date();
    const expiry = new Date(dateString);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: "expired" };
    if (diffDays <= 2) return { status: "danger" };
    if (diffDays <= 7) return { status: "warning" };
    return { status: "ok" };
  }

  const planState = getExpiryState(planFinRaw);
  const pubState = getExpiryState(pub?.expires_at);

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            <div>
              <h1 className="vv-form-title">Mi Cuenta</h1>
              <p className="vv-form-subtitle">{userEmail}</p>
            </div>
            {userId && (
              <Link
                href="/notificaciones"
                style={{
                  position: "relative",
                  color: "#c6a75e",
                  padding: "8px",
                }}
                data-testid="link-notifications"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: 24, height: 24 }}
                >
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {mounted && notifCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      backgroundColor: "#ff4444",
                      color: "white",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      border: "2px solid #0a0a0a",
                    }}
                    data-testid="notification-badge"
                  >
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Estado de cuenta</h2>
          <div className="vv-cuenta-row">
            <span className="vv-cuenta-key">Email confirmado</span>
            <span
              className={`vv-admin-status vv-admin-status-${emailConfirmed ? "approved" : "pending"}`}
            >
              {emailConfirmed ? "Confirmado" : "Pendiente"}
            </span>
          </div>
          {!emailConfirmed && (
            <div style={{ marginTop: 10 }}>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary, #999999)",
                  marginBottom: 8,
                }}
              >
                Confirma tu email para poder publicar.
              </p>
              {resendMsg && (
                <div
                  className={
                    resendMsg.startsWith("Error")
                      ? "vv-form-error-box"
                      : "vv-form-success-box"
                  }
                  style={{ marginBottom: 8, fontSize: "13px" }}
                >
                  {resendMsg}
                </div>
              )}
              <button
                className="vv-btn"
                style={{ width: "100%", fontSize: "13px" }}
                disabled={resending}
                onClick={handleResendVerification}
                data-testid="button-resend-verification"
              >
                {resending ? "Reenviando..." : "Reenviar email de verificacion"}
              </button>
            </div>
          )}
          <div className="vv-cuenta-row" style={{ marginTop: 12 }}>
            <span className="vv-cuenta-key">Identidad verificada</span>
            <span
              className={`vv-admin-status vv-admin-status-${identidadCompleta ? "approved" : "pending"}`}
            >
              {identidadCompleta ? "Completa" : "Incompleta"}
            </span>
          </div>
          {emailConfirmed && !identidadCompleta && (
            <div style={{ marginTop: 10 }}>
              <a
                href="/registro"
                className="vv-btn"
                style={{
                  display: "block",
                  textAlign: "center",
                  width: "100%",
                  fontSize: "13px",
                }}
                data-testid="link-verificar-identidad"
              >
                Verificar identidad
              </a>
            </div>
          )}
        </div>

        {hasPub && (
          <div className="vv-cuenta-section">
            <div className="vv-disp-section" data-testid="section-disponible">
              <div className="vv-disp-left">
                <h2 className="vv-cuenta-label" style={{ marginBottom: 2 }}>
                  Disponible ahora
                </h2>
                <p className="vv-disp-hint">
                  {disponibleSwitch
                    ? "Tu perfil muestra que estas disponible mientras uses la app."
                    : "Activa para aparecer como disponible en el listado."}
                </p>
              </div>
              <label
                className="vv-toggle-row"
                style={{ padding: 0, marginLeft: 12 }}
              >
                <input
                  type="checkbox"
                  className="vv-toggle-input"
                  checked={disponibleSwitch}
                  disabled={togglingDisp}
                  onChange={(e) => handleToggleDisponible(e.target.checked)}
                  data-testid="toggle-disponible"
                />
                <span
                  className={`vv-toggle ${disponibleSwitch ? "vv-toggle-on" : ""}`}
                  aria-hidden="true"
                >
                  <span className="vv-toggle-knob" />
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Plan</h2>
          <div className="vv-cuenta-plan-card">
            <div className="vv-cuenta-plan-header">
              <span
                className="vv-plan-badge"
                style={{
                  background: planConfig.badge_bg,
                  color: planConfig.badge_text,
                }}
              >
                {planConfig.name}
              </span>
              {planState.status === "expired" ? (
                <span className="vv-cuenta-plan-vencido">VENCIDO</span>
              ) : (
                <span
                  className={`vv-cuenta-plan-estado ${isExpired || planEstado === "vencido" ? "vv-cuenta-plan-vencido" : planEstado === "activo" ? "vv-cuenta-plan-activo" : ""}`}
                >
                  {isExpired
                    ? "Vencido"
                    : estadoLabel[planEstado] || planEstado}
                </span>
              )}
            </div>
            {planFin && (
              <p
                className="vv-cuenta-plan-vence"
                style={{
                  fontSize: "13px",
                  marginTop: 4,
                  color:
                    planState.status === "danger"
                      ? "#ff4d4f"
                      : planState.status === "warning"
                        ? "#f5c518"
                        : "#888",
                }}
              >
                {planState.status === "expired" ? "Venció el" : "Vence el"}:{" "}
                {mounted
                  ? planFin.toLocaleDateString("es-UY", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : planFin.toISOString().split("T")[0]}
              </p>
            )}

            <div className="vv-cuenta-plan-limits">
              <span>Fotos: hasta 25</span>
              <span>Videos: hasta 15</span>
              <span>
                Metricas:{" "}
                {planConfig.metricas_avanzadas
                  ? "Completas"
                  : planConfig.metricas
                    ? "Basicas"
                    : "No"}
              </span>
            </div>
          </div>

          <a
            href="/planes"
            className="vv-btn"
            style={{ display: "block", textAlign: "center", marginTop: 12 }}
            data-testid="link-planes"
          >
            {planEstado === "activo" && !isExpired
              ? "Mejorar plan"
              : "Ver planes"}
          </a>
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Publicación</h2>
          <div className="vv-cuenta-plan-card">
            {pub &&
            (pub.estado === "activo" || pubState.status === "expired") ? (
              <>
                <div className="vv-cuenta-plan-header">
                  {pubState.status === "expired" ? (
                    <span className="vv-cuenta-plan-vencido">VENCIDA</span>
                  ) : (
                    <span
                      className="vv-admin-status vv-admin-status-approved"
                      style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      Activa
                    </span>
                  )}
                  {mounted &&
                    pub.expires_at &&
                    pubState.status !== "expired" &&
                    pubState.status !== "ok" && (
                      <span
                        style={{
                          color:
                            pubState.status === "danger"
                              ? "#ff4d4f"
                              : "#c6a75e",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        Por vencer
                      </span>
                    )}
                </div>
                {pub.expires_at && (
                  <div style={{ marginTop: 8 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        color:
                          pubState.status === "danger"
                            ? "#ff4d4f"
                            : pubState.status === "warning"
                              ? "#f5c518"
                              : "#888",
                      }}
                    >
                      {pubState.status === "expired" ? "Venció el" : "Vence el"}
                      :{" "}
                      {mounted
                        ? new Date(pub.expires_at).toLocaleDateString("es-UY", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : pub.expires_at.split("T")[0]}
                    </p>
                    {mounted &&
                      (() => {
                        const diff =
                          new Date(pub.expires_at).getTime() - Date.now();
                        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                        return (
                          <p
                            style={{
                              fontSize: "13px",
                              marginTop: 4,
                              color:
                                pubState.status === "danger"
                                  ? "#ff4d4f"
                                  : pubState.status === "warning"
                                    ? "#f5c518"
                                    : "#888",
                            }}
                          >
                            Quedan: {days < 0 ? "0" : days} días
                          </p>
                        );
                      })()}
                  </div>
                )}

                <button
                  className="vv-btn"
                  style={{
                    width: "100%",
                    marginTop: 12,
                    background:
                      "linear-gradient(90deg, #b68a2a, #f3d77d, #b68a2a)",
                    color: "#000",
                    fontWeight: "bold",
                  }}
                  onClick={() => setShowPagoModal(true)}
                >
                  Pagar publicación
                </button>
              </>
            ) : (
              <div style={{ padding: "10px 0" }}>
                <p
                  style={{ color: "#888", fontSize: "14px", marginBottom: 12 }}
                >
                  Sin publicación activa
                </p>
                <Link
                  href="/publicar"
                  className="vv-btn"
                  style={{
                    display: "inline-block",
                    fontSize: "13px",
                    padding: "6px 16px",
                  }}
                >
                  {pub ? "Reactivar publicación" : "Crear publicación"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {hasPub && (
          <div className="vv-cuenta-section">
            <h2 className="vv-cuenta-label">Vista previa</h2>
            <div className="vv-preview-card" data-testid="preview-card">
              <div className="vv-preview-img-wrap">
                {coverUrl ? (
                  <img
                    src={fixStorageUrl(coverUrl)}
                    alt={pub.nombre || ""}
                    className="vv-preview-img"
                  />
                ) : (
                  <div className="vv-preview-img-placeholder">
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
                {pub.disponible !== false && (
                  <div
                    className="vv-card-badge vv-card-badge-disponible"
                    style={{ position: "absolute", top: 8, left: 8 }}
                  >
                    Disponible
                  </div>
                )}
                {planId !== "free" && (
                  <div
                    className="vv-card-plan-badge"
                    style={{
                      background: planConfig.badge_bg,
                      color: planConfig.badge_text,
                      position: "absolute",
                      top: 8,
                      right: 8,
                    }}
                  >
                    {planConfig.name}
                  </div>
                )}
              </div>
              <div className="vv-preview-info">
                <p className="vv-preview-name">
                  {pub.nombre || "Sin nombre"}
                  {pub.edad ? `, ${pub.edad}` : ""}
                </p>
                <p className="vv-preview-zona">
                  {pub.zona || pub.ciudad || ""}
                </p>
                {pub.descripcion && (
                  <p className="vv-preview-desc">
                    {pub.descripcion.slice(0, 100)}
                    {pub.descripcion.length > 100 ? "..." : ""}
                  </p>
                )}
                <a
                  href={`${catRoute}/${pub.id}`}
                  className="vv-preview-link"
                  data-testid="link-ver-perfil"
                >
                  Ver perfil completo
                </a>
              </div>
            </div>
          </div>
        )}

        {hasPub && userId && (
          <div className="vv-cuenta-section">
            <div className="vv-cuenta-row" style={{ marginBottom: 15 }}>
              <h2 className="vv-cuenta-label" style={{ margin: 0 }}>
                Galeria de medios
              </h2>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary, #999999)",
                }}
              >
                Fotos: {fotos.length}/25 &nbsp; Videos: {videos.length}/15
              </div>
            </div>

            {saveMsg && (
              <div
                className={`vv-form-${saveMsg.type}-box`}
                style={{ fontSize: "13px", marginBottom: 10 }}
              >
                {saveMsg.text}
              </div>
            )}

            <MediaGallery
              userId={userId}
              fotos={fotos}
              videos={videos}
              maxFotos={25}
              maxVideos={15}
              planName={planConfig.name}
              onFotosChange={setFotos}
              onVideosChange={setVideos}
              onCoverChange={setCoverUrl}
              coverUrl={coverUrl}
              videoPreviewUrl={videoPreviewUrl}
              onVideoPreviewChange={setVideoPreviewUrl}
            />

            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="vv-cuenta-toggle-btn"
                onClick={() => setEditingTags(!editingTags)}
                data-testid="button-toggle-tags"
              >
                {editingTags
                  ? "Ocultar etiquetas"
                  : "Editar etiquetas y servicios"}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    width: 16,
                    height: 16,
                    transform: editingTags ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>

            {editingTags && (
              <div className="vv-tags-editor" data-testid="tags-editor">
                {serviciosError ? (
                  <div className="vv-form-error-box">{serviciosError}</div>
                ) : serviciosLoading ? (
                  <div style={{ color: "rgba(255,255,255,0.6)" }}>
                    Cargando servicios...
                  </div>
                ) : (
                  CATEGORIA_ORDER.map((cat) => {
                    const opts = serviciosCatalog[cat] || [];
                    if (!opts.length) return null;
                    const pubField = DB_CAT_TO_PUB_FIELD[cat];
                    return (
                      <ChipEditor
                        key={cat}
                        fieldLabel={CATEGORIA_TITLES[cat] || cat}
                        options={opts}
                        selected={tags[pubField] || []}
                        onChange={(vals) =>
                          setTags((prev) => ({ ...prev, [pubField]: vals }))
                        }
                        testPrefix={`chip-${cat}`}
                      />
                    );
                  })
                )}
              </div>
            )}

            <button
              type="button"
              className="vv-btn"
              style={{ width: "100%", marginTop: 16 }}
              disabled={saving}
              onClick={handleSaveMedia}
              data-testid="button-save-media"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

        {hasPub && userId && (
          <div className="vv-cuenta-section">
            <FotosPreviewEditor
              fotosPreview={fotosPreview}
              fotosGallery={fotos}
              onChange={setFotosPreview}
              onSave={handleSavePreview}
            />
          </div>
        )}

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Historia Destacada</h2>
          <div
            className={`vv-story-card ${planEstado === "activo" && (planId === "plus" || planId === "platino" || planId === "diamante") ? "vv-story-card-active" : "vv-story-card-locked"}`}
            data-testid="story-card"
          >
            <div className="vv-story-card-icon">
              {planEstado === "activo" &&
              (planId === "plus" ||
                planId === "platino" ||
                planId === "diamante") ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              )}
            </div>
            <div className="vv-story-card-content">
              <p className="vv-story-card-title">Historia Destacada</p>
              <p className="vv-story-card-desc">
                {planEstado === "activo" &&
                (planId === "plus" ||
                  planId === "platino" ||
                  planId === "diamante")
                  ? "Mostrate primero durante 24 horas"
                  : "Exclusivo para usuarias Plus o superior"}
              </p>
            </div>
            {planEstado === "activo" &&
            (planId === "plus" ||
              planId === "platino" ||
              planId === "diamante") ? (
              <a
                href="/story"
                className="vv-story-card-btn vv-story-card-btn-gold"
                data-testid="link-story"
              >
                Gestionar historia
              </a>
            ) : (
              <a
                href="/planes"
                className="vv-story-card-btn vv-story-card-btn-locked"
                data-testid="link-upgrade-story"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: 14, height: 14 }}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Exclusivo Plus+
              </a>
            )}
          </div>
        </div>

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Contacto</h2>
          {contactMsg && (
            <div
              className={
                contactMsg.type === "error"
                  ? "vv-form-error-box"
                  : "vv-form-success-box"
              }
              style={{ fontSize: "13px", marginBottom: 10 }}
            >
              {contactMsg.text}
            </div>
          )}
          <div className="vv-contact-fields">
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-whatsapp">
                <svg viewBox="0 0 24 24" fill="#25d366" width="18" height="18">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.17-2.87.85.85-2.87-.18-.29A7.96 7.96 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                WhatsApp
              </label>
              <input
                id="input-whatsapp"
                type="tel"
                className="vv-social-input"
                placeholder="Ej: 59894582582"
                value={telefonoWhatsapp}
                onChange={(e) => setTelefonoWhatsapp(e.target.value)}
                data-testid="input-whatsapp"
              />
            </div>
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-telegram">
                <svg viewBox="0 0 24 24" fill="#2AABEE" width="18" height="18">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </label>
              <input
                id="input-telegram"
                type="text"
                className="vv-social-input"
                placeholder="tu_usuario (sin @)"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                data-testid="input-telegram"
              />
            </div>
          </div>
          <div className="vv-contact-toggles">
            <label className="vv-toggle-row" data-testid="row-telefono-visible">
              <span className="vv-toggle-text">
                Mostrar mi telefono publicamente
              </span>
              <input
                type="checkbox"
                className="vv-toggle-input"
                checked={telefonoVisible}
                onChange={(e) => setTelefonoVisible(e.target.checked)}
                data-testid="toggle-telefono-visible"
              />
              <span
                className={`vv-toggle ${telefonoVisible ? "vv-toggle-on" : ""}`}
                aria-hidden="true"
              >
                <span className="vv-toggle-knob" />
              </span>
            </label>
            <label className="vv-toggle-row" data-testid="row-video-disponible">
              <span className="vv-toggle-text">
                Disponible por videollamada
              </span>
              <input
                type="checkbox"
                className="vv-toggle-input"
                checked={videoDisponible}
                onChange={(e) => setVideoDisponible(e.target.checked)}
                data-testid="toggle-video-disponible"
              />
              <span
                className={`vv-toggle ${videoDisponible ? "vv-toggle-on" : ""}`}
                aria-hidden="true"
              >
                <span className="vv-toggle-knob" />
              </span>
            </label>
          </div>
          <button
            type="button"
            className="vv-btn"
            style={{ width: "100%", marginTop: 14 }}
            disabled={savingContact}
            onClick={handleSaveContact}
            data-testid="button-save-contact"
          >
            {savingContact ? "Guardando..." : "Guardar contacto"}
          </button>
        </div>

        {hasPub && (
          <div className="vv-cuenta-section">
            <h2 className="vv-cuenta-label">Tarifas</h2>
            {tarifasMsg && (
              <div
                className={
                  tarifasMsg.type === "error"
                    ? "vv-form-error-box"
                    : "vv-form-success-box"
                }
                style={{ fontSize: "13px", marginBottom: 10 }}
              >
                {tarifasMsg.text}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="vv-social-input-row">
                <label
                  className="vv-social-input-label"
                  htmlFor="input-tarifa-15"
                >
                  15 minutos
                </label>
                <input
                  id="input-tarifa-15"
                  type="number"
                  className="vv-social-input"
                  placeholder="Ej: 1500"
                  value={tarifaMin15}
                  onChange={(e) => setTarifaMin15(e.target.value)}
                  disabled={consultarPrecio}
                  data-testid="input-tarifa-15"
                />
              </div>
              <div className="vv-social-input-row">
                <label
                  className="vv-social-input-label"
                  htmlFor="input-tarifa-30"
                >
                  30 minutos
                </label>
                <input
                  id="input-tarifa-30"
                  type="number"
                  className="vv-social-input"
                  placeholder="Ej: 2500"
                  value={tarifaMin30}
                  onChange={(e) => setTarifaMin30(e.target.value)}
                  disabled={consultarPrecio}
                  data-testid="input-tarifa-30"
                />
              </div>
              <div className="vv-social-input-row">
                <label
                  className="vv-social-input-label"
                  htmlFor="input-tarifa-hora"
                >
                  1 hora
                </label>
                <input
                  id="input-tarifa-hora"
                  type="number"
                  className="vv-social-input"
                  placeholder="Ej: 4500"
                  value={tarifaHora1}
                  onChange={(e) => setTarifaHora1(e.target.value)}
                  disabled={consultarPrecio}
                  data-testid="input-tarifa-hora"
                />
              </div>
            </div>
            <div className="vv-contact-toggles" style={{ marginTop: 10 }}>
              <label
                className="vv-toggle-row"
                data-testid="row-consultar-precio"
              >
                <span className="vv-toggle-text">Consultar por WhatsApp</span>
                <input
                  type="checkbox"
                  className="vv-toggle-input"
                  checked={consultarPrecio}
                  onChange={(e) => setConsultarPrecio(e.target.checked)}
                  data-testid="toggle-consultar-precio"
                />
                <span
                  className={`vv-toggle ${consultarPrecio ? "vv-toggle-on" : ""}`}
                  aria-hidden="true"
                >
                  <span className="vv-toggle-knob" />
                </span>
              </label>
            </div>
            <div className="vv-social-input-group" style={{ marginTop: 14 }}>
              <div className="vv-social-input-row">
                <label
                  className="vv-social-input-label"
                  htmlFor="input-precio-card"
                >
                  Precio en tarjeta
                </label>
                <input
                  id="input-precio-card"
                  type="number"
                  className="vv-social-input"
                  placeholder="Ej: 3000"
                  value={precioCard}
                  onChange={(e) => setPrecioCard(e.target.value)}
                  data-testid="input-precio-card"
                />
              </div>
            </div>
            <div className="vv-contact-toggles" style={{ marginTop: 10 }}>
              <label className="vv-toggle-row" data-testid="row-mostrar-precio">
                <span className="vv-toggle-text">
                  Mostrar precio en tarjeta
                </span>
                <input
                  type="checkbox"
                  className="vv-toggle-input"
                  checked={mostrarPrecio}
                  onChange={(e) => setMostrarPrecio(e.target.checked)}
                  data-testid="toggle-mostrar-precio"
                />
                <span
                  className={`vv-toggle ${mostrarPrecio ? "vv-toggle-on" : ""}`}
                  aria-hidden="true"
                >
                  <span className="vv-toggle-knob" />
                </span>
              </label>
            </div>
            <button
              type="button"
              className="vv-btn"
              style={{ width: "100%", marginTop: 14 }}
              disabled={savingTarifas}
              onClick={handleSaveTarifas}
              data-testid="button-save-tarifas"
            >
              {savingTarifas ? "Guardando..." : "Guardar tarifas"}
            </button>
          </div>
        )}

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Redes sociales</h2>
          {socialMsg && (
            <div
              className={
                socialMsg.type === "error"
                  ? "vv-form-error-box"
                  : "vv-form-success-box"
              }
              style={{ fontSize: "13px", marginBottom: 10 }}
            >
              {socialMsg.text}
            </div>
          )}
          <div className="vv-social-inputs">
            <div className="vv-social-input-row">
              <label
                className="vv-social-input-label"
                htmlFor="input-instagram"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.97.24 2.43.403a4.088 4.088 0 011.47.958c.458.458.779.91.958 1.47.163.46.35 1.26.404 2.43.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.24 1.97-.404 2.43a4.088 4.088 0 01-.958 1.47 4.088 4.088 0 01-1.47.958c-.46.163-1.26.35-2.43.404-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.97-.24-2.43-.404a4.088 4.088 0 01-1.47-.958 4.088 4.088 0 01-.958-1.47c-.163-.46-.35-1.26-.404-2.43C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.054-1.17.24-1.97.404-2.43a4.088 4.088 0 01.958-1.47 4.088 4.088 0 011.47-.958c.46-.163 1.26-.35 2.43-.404C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.131 4.902.333 4.14.63a6.21 6.21 0 00-2.245 1.462A6.21 6.21 0 00.433 4.337C.136 5.1-.066 5.973.007 7.251.07 8.53.056 8.939.056 12.198c0 3.259.014 3.668.072 4.948.059 1.277.261 2.15.558 2.913a6.21 6.21 0 001.462 2.245 6.21 6.21 0 002.245 1.462c.762.297 1.636.499 2.913.558C8.53 24.383 8.939 24.397 12.198 24.397c3.259 0 3.668-.014 4.948-.072 1.277-.059 2.15-.261 2.913-.558a6.21 6.21 0 002.245-1.462 6.21 6.21 0 001.462-2.245c.297-.762.499-1.636.558-2.913.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.059-1.277-.261-2.15-.558-2.913a6.21 6.21 0 00-1.462-2.245A6.21 6.21 0 0019.86.433C19.098.136 18.224-.066 16.947.007 15.668.07 15.259.056 12 .056zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-7.998 3.999 3.999 0 010 7.998zm6.406-10.845a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
                </svg>
                Instagram
              </label>
              <input
                id="input-instagram"
                type="url"
                className="vv-social-input"
                placeholder="https://instagram.com/tu_usuario"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                data-testid="input-instagram-url"
              />
            </div>
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-onlyfans">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.667a6.667 6.667 0 110-13.334 6.667 6.667 0 010 13.334zm0-10.667a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
                OnlyFans
              </label>
              <input
                id="input-onlyfans"
                type="url"
                className="vv-social-input"
                placeholder="https://onlyfans.com/tu_usuario"
                value={onlyfansUrl}
                onChange={(e) => setOnlyfansUrl(e.target.value)}
                data-testid="input-onlyfans-url"
              />
            </div>
            <div className="vv-social-input-row">
              <label className="vv-social-input-label" htmlFor="input-twitter">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter / X
              </label>
              <input
                id="input-twitter"
                type="url"
                className="vv-social-input"
                placeholder="https://x.com/tu_usuario"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                data-testid="input-twitter-url"
              />
            </div>
          </div>
          <button
            type="button"
            className="vv-btn"
            style={{ width: "100%", marginTop: 14 }}
            disabled={savingSocial}
            onClick={handleSaveSocial}
            data-testid="button-save-social"
          >
            {savingSocial ? "Guardando..." : "Guardar redes sociales"}
          </button>
        </div>

        {hasPub && (
          <div className="vv-cuenta-section">
            <h2 className="vv-cuenta-label">Opiniones recibidas</h2>
            {opinionesLoading ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Cargando opiniones...
              </p>
            ) : opiniones.length === 0 ? (
              <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>
                No hay opiniones todavia.
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {opiniones.map((op) => (
                  <div
                    key={op.id}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                    data-testid={`opinion-card-${op.id}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {op.autor}
                      </span>
                      <span
                        style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                      >
                        {new Date(op.created_at).toLocaleDateString("es-UY")}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "var(--gold)", fontSize: 13 }}>
                        {"★".repeat(op.rating)}
                        {"☆".repeat(5 - op.rating)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background:
                            op.status === "approved"
                              ? "rgba(80,200,120,0.12)"
                              : "rgba(255,200,50,0.12)",
                          color:
                            op.status === "approved"
                              ? "rgba(80,200,120,0.9)"
                              : "rgba(255,200,50,0.9)",
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {op.status}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        margin: "0 0 8px",
                        lineHeight: 1.5,
                      }}
                    >
                      {op.comentario}
                    </p>

                    {op.respuesta && (
                      <div
                        style={{
                          background: "rgba(198,167,94,0.06)",
                          border: "1px solid rgba(198,167,94,0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--gold)",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Tu respuesta
                          {op.respondida_at && (
                            <span
                              style={{
                                fontWeight: 400,
                                color: "var(--text-tertiary)",
                                marginLeft: 8,
                              }}
                            >
                              {new Date(op.respondida_at).toLocaleDateString(
                                "es-UY",
                              )}
                            </span>
                          )}
                        </span>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--text-secondary)",
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {op.respuesta}
                        </p>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <textarea
                        value={replyDrafts[op.id] ?? op.respuesta ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((d) => ({
                            ...d,
                            [op.id]: e.target.value,
                          }))
                        }
                        placeholder="Escribir respuesta..."
                        className="vv-input"
                        rows={2}
                        style={{ resize: "vertical", fontSize: 13 }}
                        data-testid={`textarea-reply-${op.id}`}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="vv-btn"
                          style={{ flex: 1, fontSize: 12, padding: "8px 12px" }}
                          disabled={replyingSaving === op.id}
                          onClick={() => handleReplyOpinion(op.id)}
                          data-testid={`button-reply-${op.id}`}
                        >
                          {replyingSaving === op.id
                            ? "Guardando..."
                            : "Guardar respuesta"}
                        </button>
                        <button
                          type="button"
                          className="vv-text-btn"
                          style={{
                            fontSize: 12,
                            padding: "8px 12px",
                            color: "#c55",
                            border: "1px solid rgba(200,80,80,0.2)",
                            borderRadius: 6,
                          }}
                          disabled={deletingOpinion === op.id}
                          onClick={() => handleDeleteOpinion(op.id)}
                          data-testid={`button-delete-opinion-${op.id}`}
                        >
                          {deletingOpinion === op.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="vv-cuenta-section">
          <h2 className="vv-cuenta-label">Acciones</h2>
          <div className="vv-cuenta-actions">
            <a
              href="/publicar"
              className="vv-cuenta-action-link"
              data-testid="link-publicar"
            >
              {hasPub ? "Editar datos de publicacion" : "Crear publicacion"}
            </a>
            <a
              href="/metricas"
              className="vv-cuenta-action-link"
              data-testid="link-metricas"
            >
              Ver estadisticas
            </a>
            <button
              className="vv-text-btn"
              style={{ color: "#888", marginTop: 8 }}
              onClick={handleLogout}
              data-testid="button-logout"
            >
              Cerrar sesion
            </button>
          </div>
        </div>

        <a href="/mi-cuenta" className="vv-form-back">
          Volver al inicio
        </a>
      </div>

      {showPagoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#141414",
              border: "1px solid #c6a75e44",
              borderRadius: 16,
              maxWidth: 400,
              width: "100%",
              padding: 24,
              paddingBottom: 80,
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
          >
            <button
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                color: "#888",
                fontSize: 20,
                cursor: "pointer",
              }}
              onClick={() => {
                setShowPagoModal(false);
                setManualPagoId(null);
                setManualMetodo(null);
                setManualComprobanteOk(false);
                setManualMsg(null);
              }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: 18, color: "#f2f2f2", marginBottom: 4 }}>
              Pagar publicación
            </h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
              Elegi la duracion de tu publicacion
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setPagoDuracion(d)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid",
                    borderColor:
                      pagoDuracion === d ? "#c6a75e" : "rgba(255,255,255,0.08)",
                    background:
                      pagoDuracion === d
                        ? "rgba(198,167,94,0.1)"
                        : "rgba(255,255,255,0.03)",
                    color: pagoDuracion === d ? "#c6a75e" : "#f2f2f2",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "0.2s",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{d} días</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    ${d === 30 ? "250" : d === 60 ? "500" : "750"} UYU
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="vv-btn"
                style={{ width: "100%", background: "#0084ff", border: "none" }}
                disabled={processingPago}
                onClick={() => handlePagarPublicacion("mercadopago")}
              >
                {processingPago ? "Procesando..." : "Pagar con MercadoPago"}
              </button>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  className="vv-btn"
                  style={{ width: "100%", fontSize: "12px" }}
                  disabled={processingPago}
                  onClick={() => handlePagarPublicacion("abitab")}
                >
                  Abitab
                </button>
                <button
                  className="vv-btn"
                  style={{ width: "100%", fontSize: "12px" }}
                  disabled={processingPago}
                  onClick={() => handlePagarPublicacion("redpagos")}
                >
                  RedPagos
                </button>
              </div>
              <button
                className="vv-btn"
                style={{ width: "100%" }}
                disabled={processingPago}
                onClick={() => handlePagarPublicacion("transferencia")}
              >
                {processingPago ? "Procesando..." : "Transferencia bancaria"}
              </button>
            </div>
            {manualPagoId && manualMetodo && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#c6a75e",
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  Pago manual generado
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#bbb",
                    lineHeight: 1.35,
                    marginBottom: 10,
                  }}
                >
                  {manualInstrucciones(manualMetodo).map((t) => (
                    <div key={t}>• {t}</div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                  Monto:{" "}
                  <span style={{ color: "#f2f2f2" }}>
                    $
                    {pagoDuracion === 30
                      ? "250"
                      : pagoDuracion === 60
                        ? "500"
                        : "750"}{" "}
                    UYU
                  </span>
                  {" · "}Duración:{" "}
                  <span style={{ color: "#f2f2f2" }}>{pagoDuracion} días</span>
                </div>

                {manualComprobanteOk ? (
                  <div style={{ fontSize: 12, color: "#8be28b" }}>
                    Comprobante enviado. Queda en revisión.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      style={{ color: "#bbb" }}
                    />
                    <button
                      className="vv-btn"
                      style={{ width: "100%" }}
                      disabled={manualUploadLoading}
                      onClick={() => subirComprobanteManual(manualPagoId)}
                    >
                      {manualUploadLoading
                        ? "Subiendo..."
                        : "Subir comprobante"}
                    </button>
                  </div>
                )}

                {manualMsg && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: manualComprobanteOk ? "#8be28b" : "#ffb3b3",
                    }}
                  >
                    {manualMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
