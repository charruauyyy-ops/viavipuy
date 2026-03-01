"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

type Mode = "login" | "register" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const supabase = getSupabase();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase no configurado. Contacta al administrador." });
      return;
    }

    if (!email.trim()) {
      setMessage({ type: "error", text: "Ingresa tu email." });
      return;
    }

    setLoading(true);

    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
        } else {
          setMessage({ type: "success", text: "Revisa tu email para restablecer tu contrasena." });
        }
      } else if (mode === "register") {
        if (!password) {
          setMessage({ type: "error", text: "Ingresa una contrasena." });
          setLoading(false);
          return;
        }
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${siteUrl}/auth/callback` },
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
        } else {
          setMessage({ type: "success", text: "Cuenta creada. Revisa tu email para confirmar." });
        }
      } else {
        if (!password) {
          setMessage({ type: "error", text: "Ingresa tu contrasena." });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
        } else {
          router.push("/mi-cuenta");
          return;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessage({ type: "error", text: msg });
    }

    setLoading(false);
  }

  const titles: Record<Mode, string> = {
    login: "Iniciar sesion",
    register: "Crear cuenta",
    reset: "Restablecer contrasena",
  };

  const buttonLabels: Record<Mode, string> = {
    login: "Iniciar sesion",
    register: "Registrarse",
    reset: "Enviar email",
  };

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">{titles[mode]}</h1>
          <p className="vv-form-subtitle">
            {mode === "reset"
              ? "Ingresa tu email y te enviaremos un link."
              : "Accede para gestionar tu publicacion."}
          </p>
        </div>

        {message && (
          <div className={message.type === "success" ? "vv-form-success-box" : "vv-form-error-box"}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="vv-form">
          <div className="vv-field">
            <label htmlFor="email" className="vv-label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="vv-input"
              placeholder="tu@email.com"
              required
              data-testid="input-email"
            />
          </div>

          {mode !== "reset" && (
            <div className="vv-field">
              <label htmlFor="password" className="vv-label">Contrasena</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="vv-input"
                placeholder="Tu contrasena"
                data-testid="input-password"
              />
            </div>
          )}

          <button type="submit" className="vv-btn" disabled={loading} data-testid="button-submit">
            {loading ? "Cargando..." : buttonLabels[mode]}
          </button>
        </form>

        <div className="vv-auth-links">
          {mode === "login" && (
            <>
              <button type="button" className="vv-text-btn" onClick={() => { setMode("register"); setMessage(null); }} data-testid="button-no-account">
                No tengo cuenta
              </button>
              <button type="button" className="vv-text-btn" onClick={() => { setMode("reset"); setMessage(null); }} data-testid="button-forgot">
                Olvide mi contrasena
              </button>
            </>
          )}
          {mode === "register" && (
            <button type="button" className="vv-text-btn" onClick={() => { setMode("login"); setMessage(null); }}>
              Ya tengo cuenta
            </button>
          )}
          {mode === "reset" && (
            <button type="button" className="vv-text-btn" onClick={() => { setMode("login"); setMessage(null); }}>
              Volver a login
            </button>
          )}
        </div>

        <a href="/mi-cuenta" className="vv-form-back">Volver al inicio</a>
      </div>
    </main>
  );
}
