"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import s from "./denuncias.module.css";

interface Denuncia {
  id: string;
  publicacion_id: string;
  motivo: string;
  zona: string | null;
  telefono_reportado: string | null;
  fecha_accion: string | null;
  created_at: string;
}

export default function DenunciasAdminClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pubId, setPubId] = useState("");
  const [telefono, setTelefono] = useState("");
  const [motivo, setMotivo] = useState("");
  const [zona, setZona] = useState("");
  const [telefonoReportado, setTelefonoReportado] = useState("");
  const [verificado, setVerificado] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);

  useEffect(() => {
    async function checkAdmin() {
      const supabase = getSupabase();
      if (!supabase) { router.replace("/login"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.is_admin) { router.replace("/"); return; }
      setLoading(false);
    }
    checkAdmin();
  }, [router]);

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/admin/denuncias/list", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDenuncias(data.denuncias || []);
      } else {
        setListError("Error cargando denuncias");
      }
    } catch {
      setListError("Error de conexión al cargar denuncias");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) fetchList();
  }, [loading, fetchList]);

  async function handleBloquear() {
    if (!motivo.trim()) { setMsg({ ok: false, text: "Motivo es obligatorio" }); return; }
    if (!pubId.trim() && !telefono.trim()) { setMsg({ ok: false, text: "Ingresá un ID o teléfono" }); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/denuncias/bloquear", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicacion_id: pubId.trim() || undefined,
          telefono: telefono.trim() || undefined,
          motivo: motivo.trim(),
          zona: zona.trim() || undefined,
          telefono_reportado: telefonoReportado.trim() || undefined,
          verificado,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: `Publicación ${data.publicacion_id} bloqueada` });
        setPubId("");
        setTelefono("");
        setMotivo("");
        setZona("");
        setTelefonoReportado("");
        fetchList();
      } else {
        let errText = data.error || "Error";
        if (data.matches) {
          errText += "\n" + data.matches.map((m: { id: string; nombre: string }) => `• ${m.id} — ${m.nombre || "sin nombre"}`).join("\n");
        }
        setMsg({ ok: false, text: errText });
      }
    } catch {
      setMsg({ ok: false, text: "Error de conexión" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDesbloquear(id: string) {
    if (!confirm("¿Desbloquear esta publicación?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/denuncias/desbloquear", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicacion_id: id }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: `Publicación ${id} desbloqueada` });
        fetchList();
      } else {
        const data = await res.json();
        setMsg({ ok: false, text: data.error || "Error" });
      }
    } catch {
      setMsg({ ok: false, text: "Error de conexión" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className={s.page} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(198,167,94,0.2)", borderTop: "3px solid #c6a75e", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.inner}>
        <Link href="/admin" className={s.backLink} data-testid="link-back-admin">
          ← Panel Admin
        </Link>
        <h1 className={s.title} data-testid="text-denuncias-title">Denuncias</h1>
        <p className={s.subtitle}>Bloquear / desbloquear publicaciones y gestionar denuncias verificadas</p>

        <div className={s.card}>
          <h3 className={s.cardTitle}>Bloquear publicación</h3>
          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Publicación ID (UUID)</label>
              <input className={s.input} value={pubId} onChange={(e) => setPubId(e.target.value)} placeholder="UUID" data-testid="input-pub-id" />
            </div>
            <div className={s.field}>
              <label className={s.label}>o Teléfono</label>
              <input className={s.input} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Buscar por teléfono" data-testid="input-telefono-search" />
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Motivo *</label>
              <input className={s.input} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la denuncia" data-testid="input-motivo" />
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label className={s.label}>Zona (opcional)</label>
              <input className={s.input} value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Zona" data-testid="input-zona" />
            </div>
            <div className={s.field}>
              <label className={s.label}>Teléfono reportado (opcional)</label>
              <input className={s.input} value={telefonoReportado} onChange={(e) => setTelefonoReportado(e.target.value)} placeholder="Tel. reportado" data-testid="input-tel-reportado" />
            </div>
          </div>
          <div className={s.checkRow}>
            <input type="checkbox" checked={verificado} onChange={(e) => setVerificado(e.target.checked)} id="chk-ver" data-testid="checkbox-verificado" />
            <label htmlFor="chk-ver" className={s.checkLabel}>Verificado (visible en /denunciados)</label>
          </div>
          <div className={s.btnRow}>
            <button className={s.btnBlock} onClick={handleBloquear} disabled={busy} data-testid="button-bloquear">
              {busy ? "Procesando…" : "Bloquear"}
            </button>
          </div>
          {msg && (
            <div className={`${s.msg} ${msg.ok ? s.msgOk : s.msgErr}`} style={{ whiteSpace: "pre-wrap" }} data-testid="text-feedback">
              {msg.text}
            </div>
          )}
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}>Denuncias verificadas</h3>
          {listLoading ? (
            <p className={s.empty}>Cargando...</p>
          ) : listError ? (
            <p className={s.empty} style={{ color: "#e55" }}>{listError}</p>
          ) : denuncias.length === 0 ? (
            <p className={s.empty}>Sin denuncias verificadas</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Publicación ID</th>
                    <th>Motivo</th>
                    <th>Zona</th>
                    <th>Tel. reportado</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {denuncias.map((d) => (
                    <tr key={d.id}>
                      <td className={s.idCell} title={d.publicacion_id}>{d.publicacion_id}</td>
                      <td>{d.motivo}</td>
                      <td>{d.zona || "—"}</td>
                      <td>{d.telefono_reportado || "—"}</td>
                      <td>{d.fecha_accion || "—"}</td>
                      <td>
                        <button className={s.btnUnblock} onClick={() => handleDesbloquear(d.publicacion_id)} disabled={busy} data-testid={`button-desbloquear-${d.publicacion_id}`}>
                          Desbloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
