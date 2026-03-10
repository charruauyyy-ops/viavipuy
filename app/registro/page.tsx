"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import styles from "./registro.module.css";

type Step =
  | "loading"
  | "signup"
  | "welcome"
  | "doc_type"
  | "camera"
  | "capture"
  | "selfie"
  | "done"
  | "email_not_confirmed"
  | "enter_otp";

const DOC_TYPES = [
  { value: "cedula", label: "Cedula de Identidad" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "licencia", label: "Licencia de conducir" },
];

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [categoria, setCategoria] = useState("");
  const [docType, setDocType] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [docFrenteUploaded, setDocFrenteUploaded] = useState(false);
  const [docDorsoUploaded, setDocDorsoUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [captureStep, setCaptureStep] = useState<"frente" | "dorso">("frente");
  const [uploading, setUploading] = useState(false);
  const [otp, setOtp] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentStepNum = (() => {
    if (step === "doc_type") return 1;
    if (step === "camera" || step === "capture") return 2;
    if (step === "selfie") return 3;
    return 0;
  })();

  useEffect(() => {
    async function checkAuth() {
      const supabase = getSupabase();
      if (!supabase) {
        setStep("signup");
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        setStep("signup");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const emailConfirmed = !!(
        user.email_confirmed_at ||
        (user as unknown as Record<string, unknown>).confirmed_at
      );

      if (!emailConfirmed) {
        setStep("email_not_confirmed");
        return;
      }

      const { data: profRows } = await supabase
        .from("profiles")
        .select("doc_frente_url, doc_dorso_url, selfie_url")
        .eq("id", user.id)
        .limit(1);

      const prof = profRows && profRows.length > 0 ? profRows[0] : null;

      if (prof?.doc_frente_url && prof?.doc_dorso_url && prof?.selfie_url) {
        setDocFrenteUploaded(true);
        setDocDorsoUploaded(true);
        setSelfieUploaded(true);
        setStep("done");
      } else {
        if (prof?.doc_frente_url) setDocFrenteUploaded(true);
        if (prof?.doc_dorso_url) setDocDorsoUploaded(true);
        if (prof?.selfie_url) setSelfieUploaded(true);
        setStep("welcome");
      }
    }
    checkAuth();
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch {
      setCameraError(
        "No se pudo acceder a la camara. Verifica los permisos en tu navegador.",
      );
      return false;
    }
  }

  async function startFrontCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch {
      setCameraError("No se pudo acceder a la camara frontal.");
      return false;
    }
  }

  function capturePhoto(): Blob | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/jpeg" });
  }

  async function uploadToStorage(
    blob: Blob,
    path: string,
  ): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { error } = await supabase.storage
      .from("verificaciones")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) {
      setMessage({
        type: "error",
        text: `Error al subir imagen: ${error.message}`,
      });
      return null;
    }
    return path;
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!email.trim() || !password || !confirmPassword || !categoria) {
      setMessage({ type: "error", text: "Completa todos los campos." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Las contrasenas no coinciden." });
      return;
    }
    if (password.length < 6) {
      setMessage({
        type: "error",
        text: "La contrasena debe tener al menos 6 caracteres.",
      });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase no configurado." });
      return;
    }

    setLoading(true);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    const uid = data.user?.id;
    if (uid) {
      setUserId(uid);
    }
    setLoading(false);
    setStep("enter_otp");
  }

  async function handleCameraPermission() {
    setLoading(true);
    const ok = await startCamera();
    setLoading(false);
    if (ok) {
      setCaptureStep("frente");
      setStep("capture");
    }
  }

  async function handleCaptureDoc() {
    const blob = capturePhoto();
    if (!blob || !userId) return;
    setUploading(true);
    const side = captureStep === "frente" ? "frente" : "dorso";
    const path = `${userId}/doc_${side}_${Date.now()}.jpg`;
    const storagePath = await uploadToStorage(blob, path);
    if (storagePath) {
      const supabase = getSupabase();
      if (supabase) {
        if (side === "frente") {
          setDocFrenteUploaded(true);
          await supabase
            .from("profiles")
            .update({ doc_frente_url: storagePath })
            .eq("id", userId);
          setCaptureStep("dorso");
        } else {
          setDocDorsoUploaded(true);
          await supabase
            .from("profiles")
            .update({ doc_dorso_url: storagePath })
            .eq("id", userId);
          stopCamera();
          setStep("selfie");
        }
      }
    }
    setUploading(false);
  }

  async function handleStartSelfie() {
    setLoading(true);
    stopCamera();
    await new Promise((r) => setTimeout(r, 300));
    const ok = await startFrontCamera();
    setLoading(false);
    if (!ok) return;
  }

  async function handleCaptureSelfie() {
    const blob = capturePhoto();
    if (!blob || !userId) return;
    setUploading(true);
    const path = `${userId}/selfie_${Date.now()}.jpg`;
    const storagePath = await uploadToStorage(blob, path);
    if (storagePath) {
      setSelfieUploaded(true);
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from("profiles")
          .update({
            selfie_url: storagePath,
            verification_status: "in_review",
            verified_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
      stopCamera();
      setStep("done");
    }
    setUploading(false);
  }

  async function handleResendEmail() {
    const supabase = getSupabase();
    if (!supabase || !email) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setMessage({ type: "error", text: "Error: " + error.message });
      } else {
        setMessage({
          type: "success",
          text: "Email reenviado. Revisa tu bandeja de entrada.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "No se pudo reenviar el email." });
    }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    const supabase = getSupabase();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase no configurado." });
      return;
    }
    if (!email.trim() || !otp.trim()) {
      setMessage({ type: "error", text: "Ingresa el codigo recibido por email." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/mi-cuenta");
  }

  useEffect(() => {
    if (step === "selfie" && !cameraStream) {
      handleStartSelfie();
    }
  }, [step]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, step]);

  if (step === "loading") {
    return (
      <main className={styles.formPage}>
        <div className={styles.formContainer}>
          <p className={styles.formLoading}>Cargando...</p>
        </div>
      </main>
    );
  }

  const isVerificationDone =
    docFrenteUploaded && docDorsoUploaded && selfieUploaded;
  const isVerificationComplete = step === "done" && isVerificationDone;

  return (
    <main className={styles.formPage}>
      <div className={styles.formContainer}>
        {step !== "signup" &&
          step !== "welcome" &&
          step !== "done" &&
          step !== "email_not_confirmed" &&
          step !== "enter_otp" && (
            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(currentStepNum / 3) * 100}%` }}
                />
              </div>
              <span className={styles.progressText}>
                Paso {currentStepNum}/3
              </span>
            </div>
          )}

        {message && (
          <div
            className={
              message.type === "success" ? styles.successBox : styles.errorBox
            }
          >
            {message.text}
          </div>
        )}

        {step === "signup" && (
          <>
            <div className={`${styles.formHeader} ${styles.headerGlow}`}>
              <h1 className={styles.formTitle}>
                {"Publicá tu perfil en "}
                <span className={styles.formTitleAccent}>VIAVIP</span>
              </h1>
              <p className={styles.formSubtitle}>
                Creá tu cuenta y empezá a recibir visitas en minutos.
              </p>
            </div>

            <div className={styles.premiumCard}>
              <div className={styles.premiumCardTitle}>
                <span
                  className={styles.giftIcon}
                  role="img"
                  aria-label="regalo"
                >
                  &#127873;
                </span>
                {"Publicácion gratis por 7 dias"}
              </div>
              <p className={styles.premiumCardSubtext}>
                Proba VIAVIP sin costo y activa tu perfil en minutos.
              </p>
              <div className={styles.premiumChecks}>
                <div className={styles.premiumCheckItem}>
                  <span className={styles.premiumCheckIcon}>&#10003;</span>
                  <span>
                    Tu email <strong>nunca sera publico</strong>
                  </span>
                </div>
                <div className={styles.premiumCheckItem}>
                  <span className={styles.premiumCheckIcon}>&#10003;</span>
                  <span>
                    Solo aceptamos <strong>perfiles reales</strong>
                  </span>
                </div>
                <div className={styles.premiumCheckItem}>
                  <span className={styles.premiumCheckIcon}>&#10003;</span>
                  <span>
                    <strong>Verificamos</strong> mayoria de edad
                  </span>
                </div>
              </div>
              <p className={styles.premiumCardFooter}>
                Los perfiles completos obtienen mayor visibilidad dentro de
                VIAVIP.
              </p>
            </div>

            <form onSubmit={handleSignup} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="tu@email.com"
                  required
                  data-testid="input-email"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  Contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Minimo 6 caracteres"
                  required
                  data-testid="input-password"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirmar contrasena
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Repeti tu contrasena"
                  required
                  data-testid="input-confirm-password"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="categoria" className={styles.label}>
                  Categoria *
                </label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={styles.input}
                  required
                  data-testid="select-categoria"
                >
                  <option value="">Seleccionar...</option>
                  <option value="mujer">Mujer</option>
                  <option value="hombre">Hombre</option>
                  <option value="trans">Trans</option>
                </select>
              </div>
              <button
                type="submit"
                className={styles.btn}
                disabled={loading}
                data-testid="button-signup"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>

            <div className={styles.whatsappHelp}>
  <p className={styles.whatsappText}>
    ¿Necesitás ayuda para publicar?
  </p>
  <a href="/contacto" className={styles.whatsappBtn}>
    Contactar por WhatsApp
  </a>
</div>

            <div className={styles.authLinks}>
              <a
                href="/login"
                className={styles.textBtn}
                data-testid="link-login"
              >
                Ya tengo cuenta
              </a>
            </div>
          </>
        )}

        {step === "enter_otp" && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: 48, height: 48, color: "#22c55e" }}
              >
                <path
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className={styles.formTitle} style={{ textAlign: "center" }}>
              Ingresa el codigo
            </h1>
            <p className={styles.welcomeText}>
              Te enviamos un codigo de confirmacion a <strong>{email}</strong>.
              Ingresalo abajo para activar tu cuenta.
            </p>
            <div className={styles.field} style={{ marginTop: 16 }}>
              <label htmlFor="otp" className={styles.label}>
                Codigo
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\s+/g, ""))}
                className={styles.input}
                placeholder="Codigo de confirmacion"
                data-testid="input-otp"
              />
            </div>
            <button
              className={styles.btn}
              disabled={loading}
              onClick={handleVerifyOtp}
              data-testid="button-verify-otp"
            >
              {loading ? "Verificando..." : "Verificar codigo"}
            </button>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ marginTop: 12 }}
              disabled={loading}
              onClick={handleResendEmail}
              data-testid="button-resend-otp"
            >
              {loading ? "Reenviando..." : "Reenviar codigo"}
            </button>
          </div>
        )}

        {step === "email_not_confirmed" && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: 48, height: 48, color: "#f59e0b" }}
              >
                <path
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className={styles.formTitle} style={{ textAlign: "center" }}>
              Confirma tu email
            </h1>
            <p className={styles.welcomeText}>
              Primero necesitas confirmar tu email antes de verificar tu
              identidad. Revisa tu bandeja de entrada y haz clic en el enlace de
              confirmacion.
            </p>
            <button
              className={styles.btn}
              disabled={loading}
              onClick={handleResendEmail}
              data-testid="button-resend-email"
            >
              {loading ? "Reenviando..." : "Reenviar email de confirmacion"}
            </button>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ marginTop: 12 }}
              onClick={() => router.push("/login")}
              data-testid="button-go-login"
            >
              Ir a Login
            </button>
          </div>
        )}

        {step === "welcome" && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: 48, height: 48, color: "#22c55e" }}
              >
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className={styles.formTitle} style={{ textAlign: "center" }}>
              Verificacion de identidad
            </h1>
            <p className={styles.welcomeText}>
              Necesitamos verificar tu identidad y comprobar que sos mayor de
              edad. Este proceso es obligatorio para poder Publicár.
            </p>
            <div className={styles.welcomeSteps}>
              <div className={styles.welcomeStep}>
                <span className={styles.welcomeStepNum}>1</span>
                <span>Selecciona tu tipo de documento</span>
              </div>
              <div className={styles.welcomeStep}>
                <span className={styles.welcomeStepNum}>2</span>
                <span>Captura frente y dorso del documento</span>
              </div>
              <div className={styles.welcomeStep}>
                <span className={styles.welcomeStepNum}>3</span>
                <span>Toma una selfie para confirmar tu identidad</span>
              </div>
            </div>
            <p className={styles.welcomePrivacy}>
              Tus datos se tratan de forma confidencial y solo se usan para
              verificacion.
            </p>
            <button
              className={`${styles.btn} ${styles.btnVerify}`}
              onClick={() => setStep("doc_type")}
              data-testid="button-start-verification"
            >
              empezár verificacion
            </button>
          </div>
        )}

        {step === "doc_type" && (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Tipo de documento</h1>
              <p className={styles.formSubtitle}>
                Selecciona el documento que vas a presentar.
              </p>
            </div>
            <div className={styles.docOptions}>
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  className={`${styles.docOption} ${docType === dt.value ? styles.docOptionSelected : ""}`}
                  onClick={async () => {
                    setDocType(dt.value);
                    const supabase = getSupabase();
                    if (supabase && userId) {
                      await supabase
                        .from("profiles")
                        .update({ tipo_documento: dt.value })
                        .eq("id", userId);
                    }
                  }}
                  data-testid={`button-doc-${dt.value}`}
                >
                  <span className={styles.docOptionRadio}>
                    {docType === dt.value ? "\u25CF" : "\u25CB"}
                  </span>
                  {dt.label}
                </button>
              ))}
            </div>
            <button
              className={`${styles.btn} ${styles.btnVerify}`}
              style={{ marginTop: 16 }}
              disabled={!docType}
              onClick={() => setStep("camera")}
              data-testid="button-continue-doc"
            >
              Continuar
            </button>
          </>
        )}

        {step === "camera" && (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Permiso de camara</h1>
              <p className={styles.formSubtitle}>
                Necesitamos acceder a tu camara para capturar las fotos del
                documento.
              </p>
            </div>
            {cameraError && (
              <div className={styles.errorBox}>{cameraError}</div>
            )}
            <button
              className={`${styles.btn} ${styles.btnVerify}`}
              disabled={loading}
              onClick={handleCameraPermission}
              data-testid="button-allow-camera"
            >
              {loading ? "Solicitando permiso..." : "Permitir camara"}
            </button>
          </>
        )}

        {step === "capture" && (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>
                {captureStep === "frente"
                  ? "Frente del documento"
                  : "Dorso del documento"}
              </h1>
              <p className={styles.formSubtitle}>
                {captureStep === "frente"
                  ? "Posiciona el frente de tu documento dentro del recuadro."
                  : "Ahora da vuelta el documento y captura el dorso."}
              </p>
            </div>
            <div className={styles.cameraWrapper}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.cameraVideo}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            {captureStep === "frente" && docFrenteUploaded && (
              <p
                className={styles.formSubtitle}
                style={{ color: "#4ade80", marginTop: 8 }}
              >
                Frente capturado
              </p>
            )}
            <button
              className={`${styles.btn} ${styles.btnVerify}`}
              style={{ marginTop: 12 }}
              disabled={uploading}
              onClick={handleCaptureDoc}
              data-testid="button-capture-doc"
            >
              {uploading ? "Subiendo..." : `Capturar ${captureStep}`}
            </button>
          </>
        )}

        {step === "selfie" && (
          <>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Selfie</h1>
              <p className={styles.formSubtitle}>
                Toma una selfie clara mirando a la camara.
              </p>
            </div>
            {cameraError && (
              <div className={styles.errorBox}>{cameraError}</div>
            )}
            <div className={`${styles.cameraWrapper} ${styles.cameraSelfie}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={styles.cameraVideo}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <button
              className={`${styles.btn} ${styles.btnVerify}`}
              style={{ marginTop: 12 }}
              disabled={uploading || loading}
              onClick={handleCaptureSelfie}
              data-testid="button-capture-selfie"
            >
              {uploading
                ? "Subiendo..."
                : loading
                  ? "Iniciando camara..."
                  : "Capturar selfie"}
            </button>
          </>
        )}

        {step === "done" && !isVerificationComplete && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: 48, height: 48, color: "#22c55e" }}
              >
                <path
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className={styles.formTitle} style={{ textAlign: "center" }}>
              Revisa tu email
            </h1>
            <p className={styles.welcomeText}>
              Te enviamos un email de confirmacion a <strong>{email}</strong>.
              Confirmalo y luego inicia sesion para verificar tu identidad.
            </p>
            <p className={styles.welcomePrivacy}>
              Si no lo ves, revisa tu carpeta de spam.
            </p>
            <button
              className={styles.btn}
              onClick={() => router.push("/login")}
              data-testid="button-go-login"
            >
              Ir a Login
            </button>
          </div>
        )}

        {step === "done" && isVerificationComplete && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                style={{ width: 48, height: 48, color: "#22c55e" }}
              >
                <path
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className={styles.formTitle} style={{ textAlign: "center" }}>
              Verificacion enviada
            </h1>
            <p className={styles.welcomeText}>
              Tu documentacion fue enviada correctamente. Revisaremos tu
              identidad y te notificaremos.
            </p>
            <div className={styles.welcomeSteps} style={{ marginTop: 12 }}>
              <div className={styles.welcomeStep}>
                <span style={{ color: "#4ade80" }}>Documento frente</span>
                <span style={{ color: "#4ade80" }}>Subido</span>
              </div>
              <div className={styles.welcomeStep}>
                <span style={{ color: "#4ade80" }}>Documento dorso</span>
                <span style={{ color: "#4ade80" }}>Subido</span>
              </div>
              <div className={styles.welcomeStep}>
                <span style={{ color: "#4ade80" }}>Selfie</span>
                <span style={{ color: "#4ade80" }}>Subido</span>
              </div>
            </div>
            <button
              className={styles.btn}
              style={{ marginTop: 16 }}
              onClick={() => router.push("/mi-cuenta")}
              data-testid="button-go-account"
            >
              Ir a Mi Cuenta
            </button>
          </div>
        )}

        <a
          href="/mi-cuenta"
          className={styles.formBack}
          style={{ display: "block", marginTop: 24 }}
        >
          Volver al inicio
        </a>
      </div>
    </main>
  );
}
