"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!password || password.length < 6) {
      setMessage({ type: "error", text: "La contrasena debe tener al menos 6 caracteres." });
      return;
    }

    if (password !== confirm) {
      setMessage({ type: "error", text: "Las contrasenas no coinciden." });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase no configurado." });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ type: "success", text: "Contrasena actualizada correctamente." });
        setPassword("");
        setConfirm("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessage({ type: "error", text: msg });
    }

    setLoading(false);
  }

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">Nueva contrasena</h1>
          <p className="vv-form-subtitle">Ingresa tu nueva contrasena.</p>
        </div>

        {message && (
          <div className={message.type === "success" ? "vv-form-success-box" : "vv-form-error-box"}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="vv-form">
          <div className="vv-field">
            <label htmlFor="password" className="vv-label">Nueva contrasena</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="vv-input"
              placeholder="Minimo 6 caracteres"
              required
              data-testid="input-new-password"
            />
          </div>

          <div className="vv-field">
            <label htmlFor="confirm" className="vv-label">Confirmar contrasena</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="vv-input"
              placeholder="Repeti tu contrasena"
              required
              data-testid="input-confirm-password"
            />
          </div>

          <button type="submit" className="vv-btn" disabled={loading} data-testid="button-save-password">
            {loading ? "Guardando..." : "Guardar contrasena"}
          </button>
        </form>

        <a href="/login" className="vv-form-link" style={{ marginTop: "20px", display: "inline-block" }}>
          Ir a Login
        </a>
      </div>
    </main>
  );
}
