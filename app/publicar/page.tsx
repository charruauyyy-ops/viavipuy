"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { getPlanConfig } from "@/lib/plans";
import MediaGallery from "@/app/components/MediaGallery";

const DEPARTAMENTOS = [
  "Montevideo",
  "Canelones",
  "Maldonado",
  "Colonia",
  "Salto",
  "Paysandu",
  "Rivera",
  "Rocha",
  "Tacuarembo",
  "Cerro Largo",
  "Artigas",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Rio Negro",
  "San Jose",
  "Soriano",
  "Treinta y Tres",
];

const ATIENDE_EN_OPTIONS = [
  "Lugar propio",
  "Departamento",
  "Hotel",
  "Domicilio",
  "Virtual",
];

const CATEGORIA_ORDER = ["servicios", "sexo_oral", "fantasias", "virtuales", "masajes", "idiomas"] as const;

const CATEGORIA_TITLES: Record<string, string> = {
  servicios: "Servicios",
  sexo_oral: "Sexo oral",
  fantasias: "Fantasias",
  virtuales: "Servicios virtuales",
  masajes: "Tipos de masajes",
  idiomas: "Idiomas",
};

const DB_CAT_TO_FORM: Record<string, string> = {
  servicios: "servicios",
  sexo_oral: "sexo_oral",
  fantasias: "fantasias",
  virtuales: "servicios_virtuales",
  masajes: "tipos_masajes",
  idiomas: "idiomas",
};

interface ServicioRow {
  id: string;
  nombre: string;
  categoria: string;
}

interface FormStep1 {
  nombre: string;
  edad: string;
  descripcion: string;
  departamento: string;
  zona: string;
  cover_url: string;
  disponible: boolean;
  altura_cm: string;
  peso_kg: string;
  atiende_en: string;
  horarios: string;
  tarifa_hora: string;
  acepta_usd: boolean;
}

interface FormStep2 {
  servicios: string[];
  sexo_oral: string[];
  fantasias: string[];
  servicios_virtuales: string[];
  tipos_masajes: string[];
  idiomas: string[];
}

const EMPTY_STEP1: FormStep1 = {
  nombre: "",
  edad: "",
  descripcion: "",
  departamento: "",
  zona: "",
  cover_url: "",
  disponible: true,
  altura_cm: "",
  peso_kg: "",
  atiende_en: "",
  horarios: "",
  tarifa_hora: "",
  acepta_usd: false,
};

const EMPTY_STEP2: FormStep2 = {
  servicios: [],
  sexo_oral: [],
  fantasias: [],
  servicios_virtuales: [],
  tipos_masajes: [],
  idiomas: [],
};

type Msg = { type: "success" | "error"; text: string };

function ChipSelector({
  label,
  items,
  selectedNames,
  onChange,
  testIdPrefix,
}: {
  label: string;
  items: ServicioRow[];
  selectedNames: string[];
  onChange: (vals: string[]) => void;
  testIdPrefix: string;
}) {
  function toggle(nombre: string) {
    onChange(
      selectedNames.includes(nombre)
        ? selectedNames.filter((s) => s !== nombre)
        : [...selectedNames, nombre],
    );
  }
  return (
    <div className="vv-field">
      <label className="vv-label">{label}</label>
      <div className="vv-chip-selector">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`vv-chip-option ${selectedNames.includes(item.nombre) ? "vv-chip-option-selected" : ""}`}
            onClick={() => toggle(item.nombre)}
            data-testid={`${testIdPrefix}-${item.nombre.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {item.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipSelectorSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="vv-field">
      <div className="vv-label" style={{ width: 100, height: 14, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
      <div className="vv-chip-selector">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 70 + Math.random() * 40,
              height: 32,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 8,
            }}
          />
        ))}
      </div>
    </div>
  );
}

async function syncPublicacionServicios(
  supabase: ReturnType<typeof getSupabase>,
  publicacionId: string,
  form2Data: FormStep2,
  catalog: Record<string, ServicioRow[]>,
) {
  if (!supabase) return;
  try {
    const nameToId = new Map<string, string>();
    for (const rows of Object.values(catalog)) {
      for (const row of rows) {
        nameToId.set(row.nombre.toLowerCase(), row.id);
        const normalized = row.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (normalized !== row.nombre.toLowerCase()) {
          nameToId.set(normalized, row.id);
        }
      }
    }

    const selectedIds = new Set<string>();
    const allNames = [
      ...form2Data.servicios,
      ...form2Data.sexo_oral,
      ...form2Data.fantasias,
      ...form2Data.servicios_virtuales,
      ...form2Data.tipos_masajes,
      ...form2Data.idiomas,
    ];
    for (const name of allNames) {
      const id = nameToId.get(name.toLowerCase()) ||
        nameToId.get(name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
      if (id) selectedIds.add(id);
    }

    await supabase
      .from("publicacion_servicios")
      .delete()
      .eq("publicacion_id", publicacionId);

    if (selectedIds.size > 0) {
      const rows = Array.from(selectedIds).map((servicioId) => ({
        publicacion_id: publicacionId,
        servicio_id: servicioId,
      }));
      await supabase.from("publicacion_servicios").insert(rows);
    }
  } catch (err) {
    console.debug("[publicar] Error syncing publicacion_servicios:", err);
  }
}

export default function PublicarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [message, setMessage] = useState<Msg | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCategoria, setUserCategoria] = useState<string>("mujer");
  const [step, setStep] = useState<1 | 2>(1);
  const [form1, setForm1] = useState<FormStep1>(EMPTY_STEP1);
  const [form2, setForm2] = useState<FormStep2>(EMPTY_STEP2);
  const [planLimits, setPlanLimits] = useState<{
    maxFotos: number | null;
    maxVideos: number;
    planName: string;
  } | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);

  const [atiendeA, setAtiendeA] = useState<string[]>([]);

  const [serviciosCatalog, setServiciosCatalog] = useState<Record<string, ServicioRow[]>>({});
  const [serviciosLoading, setServiciosLoading] = useState(true);
  const [serviciosError, setServiciosError] = useState<string | null>(null);

  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleResendConfirmation() {
    const supabase = getSupabase();
    if (!supabase || !userEmail) return;
    setResending(true);
    setResendMsg(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: userEmail });
      if (error) {
        setResendMsg("Error: " + error.message);
      } else {
        setResendMsg("Email de confirmacion reenviado. Revisa tu bandeja de entrada.");
      }
    } catch {
      setResendMsg("No se pudo reenviar el email.");
    }
    setResending(false);
  }

  async function fetchServiciosCatalog() {
    const supabase = getSupabase();
    if (!supabase) {
      setServiciosError("Supabase no configurado.");
      setServiciosLoading(false);
      return;
    }
    setServiciosLoading(true);
    setServiciosError(null);
    try {
      const { data, error } = await supabase
        .from("servicios")
        .select("id,nombre,categoria")
        .order("categoria")
        .order("nombre");
      if (error) {
        setServiciosError("Error cargando servicios: " + error.message);
        setServiciosLoading(false);
        return;
      }
      const grouped: Record<string, ServicioRow[]> = {};
      for (const row of data || []) {
        if (!grouped[row.categoria]) grouped[row.categoria] = [];
        grouped[row.categoria].push(row);
      }
      setServiciosCatalog(grouped);
    } catch {
      setServiciosError("Error cargando servicios.");
    }
    setServiciosLoading(false);
  }

  useEffect(() => {
    fetchServiciosCatalog();
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = getSupabase();
      if (!supabase) {
        setAuthError("Supabase no configurado. Contacta al administrador.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (error || !user) {
        setAuthError("Inicia sesion para publicar.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      console.log("publicar profile:", JSON.stringify(profile, null, 2));
      console.log("publicar profileError:", profileError);

      if (profileError) {
        setAuthError("Error cargando perfil: " + profileError.message);
        setLoading(false);
        return;
      }

      if (!profile) {
        setAuthError("No se encontro tu perfil. Registrate primero.");
        setLoading(false);
        return;
      }

      const emailConfirmedByAuth = !!(user.email_confirmed_at || (user as unknown as Record<string, unknown>).confirmed_at);
      const emailConfirmedByProfile = !!(profile as Record<string, unknown>).email_confirmed;
      const isEmailConfirmed = emailConfirmedByAuth || emailConfirmedByProfile;

      if (!isEmailConfirmed) {
        setEmailNotConfirmed(true);
        setLoading(false);
        return;
      }

      const planActual = profile.plan_actual || "free";
      const planEstado = profile.plan_estado || "activo";
      const now = new Date();
      const planFin = profile.paid_until ? new Date(profile.paid_until) : null;
      const isPlanExpired = planFin ? planFin < now : false;

      if (planEstado === "vencido" || isPlanExpired) {
        setAuthError("Tu plan esta vencido. Renova tu plan para publicar.");
        setLoading(false);
        return;
      }

      const cat = profile.categoria;
      if (!cat || !["mujer", "hombre", "trans"].includes(cat)) {
        setAuthError("Falta categoria en tu perfil. Contacta al administrador o registrate de nuevo.");
        setLoading(false);
        return;
      }
      setUserCategoria(cat);

      const planConfig = getPlanConfig(planActual);
      setPlanLimits({
        maxFotos: planConfig.max_fotos,
        maxVideos: planConfig.max_videos,
        planName: planConfig.name,
      });

      const { data: pub } = await supabase
        .from("publicaciones")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pub) {
        setExistingId(pub.id);
        setForm1({
          nombre: pub.nombre ?? "",
          edad: pub.edad != null ? String(pub.edad) : "",
          descripcion: pub.descripcion ?? "",
          departamento: pub.departamento ?? "",
          zona: pub.zona ?? "",
          cover_url: pub.cover_url ?? "",
          disponible: pub.disponible ?? true,
          altura_cm: pub.altura_cm != null ? String(pub.altura_cm) : "",
          peso_kg: pub.peso_kg != null ? String(pub.peso_kg) : "",
          atiende_en: Array.isArray(pub.atiende_en)
            ? pub.atiende_en[0] || ""
            : (pub.atiende_en ?? ""),
          horarios: pub.horarios ?? "",
          tarifa_hora: pub.tarifa_hora != null ? String(pub.tarifa_hora) : "",
          acepta_usd: pub.acepta_usd ?? false,
        });
        setForm2({
          servicios: pub.servicios ?? [],
          sexo_oral: pub.sexo_oral ?? [],
          fantasias: pub.fantasias ?? [],
          servicios_virtuales: pub.servicios_virtuales ?? [],
          tipos_masajes: pub.tipos_masajes ?? [],
          idiomas: pub.idiomas ?? [],
        });
        setFotos(Array.isArray(pub.fotos) ? pub.fotos : []);
        setVideos(Array.isArray(pub.videos) ? pub.videos : []);
        if (Array.isArray(pub.atiende_a)) {
          setAtiendeA(pub.atiende_a.filter((v: string) => ["Hombre", "Mujer", "Parejas"].includes(v)));
        }
      }

      setLoading(false);
    }

    init();
  }, []);

  function handleChange1(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm1((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    setForm1((prev) => ({ ...prev, [name]: value }));
  }

  function validateStep1(): string | null {
    if (!form1.nombre.trim()) return "El nombre es requerido.";
    if (!form1.edad.trim()) return "La edad es requerida.";
    const edadNum = parseInt(form1.edad, 10);
    if (Number.isNaN(edadNum) || edadNum < 18 || edadNum > 99)
      return "Edad invalida (18-99).";
    if (!form1.descripcion.trim()) return "La descripcion es requerida.";
    if (form1.descripcion.length > 900)
      return "La descripcion no puede superar 900 caracteres.";
    if (!form1.departamento.trim()) return "El departamento es requerido.";
    if (!form1.zona.trim()) return "La zona es requerida.";
    if (!form1.atiende_en.trim()) return "Indica donde atendes.";
    if (atiendeA.length === 0) return "Selecciona al menos una opcion en 'Atiende a'.";
    return null;
  }

  function goToStep2() {
    setMessage(null);
    const err = validateStep1();
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToStep1() {
    setStep(1);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setMessage(null);

    const err = validateStep1();
    if (err) {
      setStep(1);
      setMessage({ type: "error", text: err });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase no configurado." });
      return;
    }

    const { data, error: userErr } = await supabase.auth.getUser();
    const user = data?.user;

    if (userErr || !user) {
      setMessage({
        type: "error",
        text: "Sesion invalida. Volve a iniciar sesion.",
      });
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      nombre: form1.nombre.trim(),
      descripcion: form1.descripcion.trim() || null,
      departamento: form1.departamento.trim() || null,
      zona: form1.zona.trim() || null,
      ciudad: form1.departamento.trim() || null,
      cover_url: form1.cover_url.trim() || null,
      disponible: !!form1.disponible,
      atiende_en: form1.atiende_en.trim() ? [form1.atiende_en.trim()] : [],
      horarios: form1.horarios.trim() || null,
      acepta_usd: !!form1.acepta_usd,
      categoria: userCategoria,
      atiende_a: atiendeA,
      servicios: form2.servicios,
      sexo_oral: form2.sexo_oral,
      fantasias: form2.fantasias,
      servicios_virtuales: form2.servicios_virtuales,
      tipos_masajes: form2.tipos_masajes,
      idiomas: form2.idiomas,
      fotos: fotos,
      videos: videos,
    };
    // Normalize array fields for Postgres text[] columns (prevents "malformed array literal")
    const asTextArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter(Boolean).map((x) => String(x));
      if (typeof v === "string") {
        const s = v.trim();
        return s ? [s] : [];
      }
      return [];
    };

    (payload as any).servicios = asTextArray((payload as any).servicios);
    (payload as any).sexo_oral = asTextArray((payload as any).sexo_oral);
    (payload as any).fantasias = asTextArray((payload as any).fantasias);
    (payload as any).servicios_virtuales = asTextArray(
      (payload as any).servicios_virtuales,
    );
    (payload as any).tipos_masajes = asTextArray(
      (payload as any).tipos_masajes,
    );
    (payload as any).idiomas = asTextArray((payload as any).idiomas);
    (payload as any).atiende_en = asTextArray((payload as any).atiende_en);
    (payload as any).fotos = asTextArray((payload as any).fotos);
    (payload as any).videos = asTextArray((payload as any).videos);

    if (form1.edad.trim()) {
      const edadNum = parseInt(form1.edad, 10);
      if (!Number.isNaN(edadNum)) payload.edad = edadNum;
    } else {
      payload.edad = null;
    }

    if (form1.altura_cm.trim()) {
      const v = parseInt(form1.altura_cm, 10);
      if (!Number.isNaN(v)) payload.altura_cm = v;
    } else {
      payload.altura_cm = null;
    }

    if (form1.peso_kg.trim()) {
      const v = parseInt(form1.peso_kg, 10);
      if (!Number.isNaN(v)) payload.peso_kg = v;
    } else {
      payload.peso_kg = null;
    }

    if (form1.tarifa_hora.trim()) {
      const v = parseInt(form1.tarifa_hora, 10);
      if (!Number.isNaN(v)) payload.tarifa_hora = v;
    } else {
      payload.tarifa_hora = null;
    }

    try {
      if (existingId) {
        const { error } = await supabase
          .from("publicaciones")
          .update(payload)
          .eq("id", existingId)
          .eq("user_id", user.id);

        if (error) {
          const hint = error.message.includes("column")
            ? " (Es posible que falte ejecutar la migracion SQL en Supabase)"
            : "";
          setMessage({
            type: "error",
            text: `Error al actualizar: ${error.message}${hint}`,
          });
        } else {
          await syncPublicacionServicios(supabase, existingId, form2, serviciosCatalog);
          setMessage({ type: "success", text: "Publicacion guardada." });
          const catRoute =
            userCategoria === "hombre"
              ? "/hombres"
              : userCategoria === "trans"
                ? "/trans"
                : "/mujeres";
          setTimeout(() => router.push(catRoute), 1200);
        }
      } else {
        const insertPayload = { ...payload, user_id: user.id };
        const { data: row, error } = await supabase
          .from("publicaciones")
          .insert(insertPayload)
          .select("id")
          .single();

        if (error) {
          const hint = error.message.includes("column")
            ? " (Es posible que falte ejecutar la migracion SQL en Supabase)"
            : "";
          setMessage({
            type: "error",
            text: `Error al crear: ${error.message}${hint}`,
          });
        } else {
          setExistingId(row.id);
          await syncPublicacionServicios(supabase, row.id, form2, serviciosCatalog);
          setMessage({ type: "success", text: "Publicacion creada." });
          const catRoute =
            userCategoria === "hombre"
              ? "/hombres"
              : userCategoria === "trans"
                ? "/trans"
                : "/mujeres";
          setTimeout(() => router.push(catRoute), 1200);
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setMessage({ type: "error", text: errorMessage });
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <p className="vv-form-loading">Cargando...</p>
        </div>
      </main>
    );
  }

  if (emailNotConfirmed) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-header">
            <h1 className="vv-form-title">Confirma tu email</h1>
          </div>
          <div className="vv-form-error-box" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
            Para publicar necesitas confirmar tu email. Revisa tu bandeja de entrada y haz clic en el enlace de confirmacion.
          </div>
          {resendMsg && (
            <div className={resendMsg.startsWith("Error") ? "vv-form-error-box" : "vv-form-success-box"} style={{ marginTop: 12 }}>
              {resendMsg}
            </div>
          )}
          <button
            type="button"
            className="vv-btn"
            style={{ width: "100%", marginTop: 16 }}
            disabled={resending}
            onClick={handleResendConfirmation}
            data-testid="button-resend-email"
          >
            {resending ? "Reenviando..." : "Reenviar email de confirmacion"}
          </button>
          <div style={{ marginTop: 16, display: "flex", gap: 16 }}>
            <a href="/mi-cuenta" className="vv-form-link">Mi cuenta</a>
            <a href="/" className="vv-form-link">Volver al inicio</a>
          </div>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-header">
            <h1 className="vv-form-title">Publicar</h1>
          </div>
          <div className="vv-form-error-box">{authError}</div>
          <a href="/registro" className="vv-form-link">
            Completar verificacion
          </a>
          <a href="/login" className="vv-form-link" style={{ marginLeft: 16 }}>
            Ir a Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">
            {existingId ? "Editar publicacion" : "Nueva publicacion"}
          </h1>
          <p className="vv-form-subtitle">
            {existingId
              ? "Modifica los datos de tu anuncio."
              : "Completa los datos para publicar tu anuncio."}
          </p>
        </div>

        {planLimits && (
          <div className="vv-plan-limits-info">
            <span>Plan {planLimits.planName}</span>
            <span>
              Fotos:{" "}
              {planLimits.maxFotos === null
                ? "Ilimitadas"
                : `max ${planLimits.maxFotos}`}
            </span>
            <span>
              Videos:{" "}
              {planLimits.maxVideos >= 999
                ? "Ilimitados"
                : planLimits.maxVideos}
            </span>
            <a href="/planes" className="vv-form-link" style={{ fontSize: 12 }}>
              Mejorar plan
            </a>
          </div>
        )}

        <div className="vv-stepper">
          <button
            type="button"
            className={`vv-step ${step === 1 ? "vv-step-active" : "vv-step-done"}`}
            onClick={goToStep1}
            data-testid="step-1"
          >
            <span className="vv-step-num">1</span>
            Principal
          </button>
          <div className="vv-step-connector" />
          <button
            type="button"
            className={`vv-step ${step === 2 ? "vv-step-active" : ""}`}
            onClick={() => {
              if (step === 1) goToStep2();
            }}
            data-testid="step-2"
          >
            <span className="vv-step-num">2</span>
            Servicios
          </button>
        </div>

        {message && (
          <div
            className={
              message.type === "success"
                ? "vv-form-success-box"
                : "vv-form-error-box"
            }
          >
            {message.text}
          </div>
        )}

        {step === 1 && (
          <div className="vv-form">
            <div className="vv-field">
              <label htmlFor="nombre" className="vv-label">
                Nombre *
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={form1.nombre}
                onChange={handleChange1}
                className="vv-input"
                placeholder="Tu nombre"
                required
                data-testid="input-nombre"
              />
            </div>

            <div className="vv-field-row">
              <div className="vv-field">
                <label htmlFor="edad" className="vv-label">
                  Edad *
                </label>
                <input
                  id="edad"
                  name="edad"
                  type="number"
                  value={form1.edad}
                  onChange={handleChange1}
                  className="vv-input"
                  placeholder="25"
                  min="18"
                  max="99"
                  required
                  data-testid="input-edad"
                />
              </div>
            </div>

            <div className="vv-field">
              <label htmlFor="descripcion" className="vv-label">
                Descripcion *{" "}
                <span
                  style={{ color: "var(--text-tertiary)", fontWeight: 400 }}
                >
                  ({form1.descripcion.length}/900)
                </span>
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={form1.descripcion}
                onChange={handleChange1}
                className="vv-textarea"
                rows={4}
                placeholder="Escribe una descripcion sobre ti..."
                maxLength={900}
                required
                data-testid="input-descripcion"
              />
            </div>

            <div className="vv-field-row">
              <div className="vv-field">
                <label htmlFor="departamento" className="vv-label">
                  Departamento *
                </label>
                <select
                  id="departamento"
                  name="departamento"
                  value={form1.departamento}
                  onChange={handleChange1}
                  className="vv-input"
                  required
                  data-testid="select-departamento"
                >
                  <option value="">Seleccionar...</option>
                  {DEPARTAMENTOS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vv-field">
                <label htmlFor="zona" className="vv-label">
                  Zona *
                </label>
                <input
                  id="zona"
                  name="zona"
                  type="text"
                  value={form1.zona}
                  onChange={handleChange1}
                  className="vv-input"
                  placeholder="Pocitos, Centro..."
                  required
                  data-testid="input-zona"
                />
              </div>
            </div>

            <div className="vv-field">
              <label htmlFor="atiende_en" className="vv-label">
                Atiende en *
              </label>
              <select
                id="atiende_en"
                name="atiende_en"
                value={form1.atiende_en}
                onChange={handleChange1}
                className="vv-input"
                required
                data-testid="select-atiende-en"
              >
                <option value="">Seleccionar...</option>
                {ATIENDE_EN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="vv-field">
              <label className="vv-label">Atiende a *</label>
              <div className="vv-field-row" style={{ gap: 24 }}>
                <div className="vv-field-check">
                  <input
                    id="atiende_a_hombre"
                    type="checkbox"
                    checked={atiendeA.includes("Hombre")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAtiendeA((prev) => [...prev, "Hombre"]);
                      } else {
                        setAtiendeA((prev) => prev.filter((v) => v !== "Hombre"));
                      }
                    }}
                    className="vv-checkbox"
                    data-testid="checkbox-atiende-hombre"
                  />
                  <label htmlFor="atiende_a_hombre" className="vv-label-check">
                    Hombre
                  </label>
                </div>
                <div className="vv-field-check">
                  <input
                    id="atiende_a_mujer"
                    type="checkbox"
                    checked={atiendeA.includes("Mujer")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAtiendeA((prev) => [...prev, "Mujer"]);
                      } else {
                        setAtiendeA((prev) => prev.filter((v) => v !== "Mujer"));
                      }
                    }}
                    className="vv-checkbox"
                    data-testid="checkbox-atiende-mujer"
                  />
                  <label htmlFor="atiende_a_mujer" className="vv-label-check">
                    Mujer
                  </label>
                </div>
                <div className="vv-field-check">
                  <input
                    id="atiende_a_parejas"
                    type="checkbox"
                    checked={atiendeA.includes("Parejas")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAtiendeA((prev) => [...prev, "Parejas"]);
                      } else {
                        setAtiendeA((prev) => prev.filter((v) => v !== "Parejas"));
                      }
                    }}
                    className="vv-checkbox"
                    data-testid="checkbox-atiende-parejas"
                  />
                  <label htmlFor="atiende_a_parejas" className="vv-label-check">
                    Parejas
                  </label>
                </div>
              </div>
            </div>

            <div className="vv-field-row">
              <div className="vv-field">
                <label htmlFor="altura_cm" className="vv-label">
                  Altura (cm)
                </label>
                <input
                  id="altura_cm"
                  name="altura_cm"
                  type="number"
                  value={form1.altura_cm}
                  onChange={handleChange1}
                  className="vv-input"
                  placeholder="165"
                  min="100"
                  max="250"
                  data-testid="input-altura"
                />
              </div>
              <div className="vv-field">
                <label htmlFor="peso_kg" className="vv-label">
                  Peso (kg)
                </label>
                <input
                  id="peso_kg"
                  name="peso_kg"
                  type="number"
                  value={form1.peso_kg}
                  onChange={handleChange1}
                  className="vv-input"
                  placeholder="55"
                  min="30"
                  max="200"
                  data-testid="input-peso"
                />
              </div>
            </div>

            <div className="vv-field-row">
              <div className="vv-field">
                <label htmlFor="tarifa_hora" className="vv-label">
                  Tarifa/hora ($)
                </label>
                <input
                  id="tarifa_hora"
                  name="tarifa_hora"
                  type="number"
                  value={form1.tarifa_hora}
                  onChange={handleChange1}
                  className="vv-input"
                  placeholder="2500"
                  min="0"
                  data-testid="input-tarifa"
                />
              </div>
              <div className="vv-field">
                <label htmlFor="horarios" className="vv-label">
                  Horarios
                </label>
                <input
                  id="horarios"
                  name="horarios"
                  type="text"
                  value={form1.horarios}
                  onChange={handleChange1}
                  className="vv-input"
                  placeholder="10hs - 22hs"
                  maxLength={80}
                  data-testid="input-horarios"
                />
              </div>
            </div>

            <div className="vv-field" style={{ paddingBottom: "16px" }}>
              <p style={{ color: "#999", fontSize: "14px", margin: 0 }}>
                💡 El contacto público se configura desde <strong>Mi Cuenta</strong>
              </p>
            </div>

            {userId && planLimits && (
              <MediaGallery
                userId={userId}
                fotos={fotos}
                videos={videos}
                maxFotos={planLimits.maxFotos}
                maxVideos={planLimits.maxVideos}
                planName={planLimits.planName}
                onFotosChange={setFotos}
                onVideosChange={setVideos}
                onCoverChange={(url) => setForm1((prev) => ({ ...prev, cover_url: url }))}
                coverUrl={form1.cover_url}
              />
            )}

            <div className="vv-field">
              <label htmlFor="cover_url" className="vv-label">
                URL de portada (o subi fotos arriba)
              </label>
              <input
                id="cover_url"
                name="cover_url"
                type="url"
                value={form1.cover_url}
                onChange={handleChange1}
                className="vv-input"
                placeholder="https://ejemplo.com/foto.jpg"
                data-testid="input-cover-url"
              />
            </div>

            <div className="vv-field-row">
              <div className="vv-field-check">
                <input
                  id="disponible"
                  name="disponible"
                  type="checkbox"
                  checked={form1.disponible}
                  onChange={handleChange1}
                  className="vv-checkbox"
                  data-testid="checkbox-disponible"
                />
                <label htmlFor="disponible" className="vv-label-check">
                  Disponible
                </label>
              </div>
              <div className="vv-field-check">
                <input
                  id="acepta_usd"
                  name="acepta_usd"
                  type="checkbox"
                  checked={form1.acepta_usd}
                  onChange={handleChange1}
                  className="vv-checkbox"
                  data-testid="checkbox-acepta-usd"
                />
                <label htmlFor="acepta_usd" className="vv-label-check">
                  Acepta USD
                </label>
              </div>
            </div>

            <div className="vv-form-nav">
              <button
                type="button"
                className="vv-btn"
                onClick={goToStep2}
                data-testid="button-siguiente"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="vv-form">
            {serviciosLoading ? (
              CATEGORIA_ORDER.map((cat) => (
                <ChipSelectorSkeleton key={cat} count={cat === "idiomas" ? 6 : 5} />
              ))
            ) : serviciosError ? (
              <div className="vv-field">
                <div className="vv-form-error-box">{serviciosError}</div>
                <button
                  type="button"
                  className="vv-btn-secondary"
                  onClick={fetchServiciosCatalog}
                  data-testid="button-retry-servicios"
                  style={{ marginTop: 8 }}
                >
                  Reintentar
                </button>
              </div>
            ) : Object.keys(serviciosCatalog).length === 0 ? (
              <div className="vv-field">
                <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 16 }}>
                  No hay servicios disponibles.
                </p>
              </div>
            ) : (
              CATEGORIA_ORDER.map((cat) => {
                const items = serviciosCatalog[cat];
                if (!items || items.length === 0) return null;
                const formKey = DB_CAT_TO_FORM[cat] as keyof FormStep2;
                return (
                  <ChipSelector
                    key={cat}
                    label={CATEGORIA_TITLES[cat] || cat}
                    items={items}
                    selectedNames={form2[formKey]}
                    onChange={(vals) => setForm2((p) => ({ ...p, [formKey]: vals }))}
                    testIdPrefix={`chip-${cat}`}
                  />
                );
              })
            )}

            <div className="vv-form-nav">
              <button
                type="button"
                className="vv-btn-secondary"
                onClick={goToStep1}
                data-testid="button-atras"
              >
                Atras
              </button>
              <button
                type="button"
                className="vv-btn"
                onClick={handleSubmit}
                disabled={saving}
                data-testid="button-publicar"
                style={{ flex: 1 }}
              >
                {saving
                  ? "Guardando..."
                  : existingId
                    ? "Guardar cambios"
                    : "Publicar"}
              </button>
            </div>
          </div>
        )}

        <a href="/mi-cuenta" className="vv-form-back">
          Volver al inicio
        </a>
      </div>
    </main>
  );
}
