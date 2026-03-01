"use client";

import { useState } from "react";
import { fixStorageUrl } from "@/lib/fixStorageUrl";

const MAX_PREVIEW_SLOTS = 5;

interface FotosPreviewEditorProps {
  fotosPreview: string[];
  fotosGallery: string[];
  onChange: (newPreview: string[]) => void;
  onSave: (newPreview: string[]) => Promise<void>;
}

export default function FotosPreviewEditor({
  fotosPreview,
  fotosGallery,
  onChange,
  onSave,
}: FotosPreviewEditorProps) {
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const count = fotosPreview.length;
  const available = fotosGallery.filter((url) => !fotosPreview.includes(url));
  const canAdd = count < MAX_PREVIEW_SLOTS;

  async function persist(updated: string[]) {
    onChange(updated);
    setSaving(true);
    setMsg(null);
    try {
      await onSave(updated);
      setMsg({ type: "success", text: "Guardado." });
    } catch {
      setMsg({ type: "error", text: "Error al guardar." });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 2500);
  }

  function handleRemove(index: number) {
    const updated = fotosPreview.filter((_, i) => i !== index);
    persist(updated);
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const updated = [...fotosPreview];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    persist(updated);
  }

  function handleMoveDown(index: number) {
    if (index >= fotosPreview.length - 1) return;
    const updated = [...fotosPreview];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    persist(updated);
  }

  function handlePick(url: string) {
    if (fotosPreview.includes(url)) return;
    if (!canAdd) return;
    const updated = [...fotosPreview, url];
    setPicking(false);
    persist(updated);
  }

  const slots = [];
  for (let i = 0; i < MAX_PREVIEW_SLOTS; i++) {
    const url = fotosPreview[i] || null;
    slots.push(
      <div
        key={i}
        className={`vv-fp-slot${url ? " vv-fp-slot-filled" : ""}`}
        data-testid={`preview-slot-${i}`}
      >
        {url ? (
          <>
            <img
              src={fixStorageUrl(url)}
              alt={`Preview ${i + 1}`}
              className="vv-fp-thumb"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
            <div className="vv-fp-slot-actions">
              {i > 0 && (
                <button
                  type="button"
                  className="vv-fp-action"
                  onClick={() => handleMoveUp(i)}
                  title="Mover arriba"
                  disabled={saving}
                  data-testid={`button-preview-up-${i}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}
              {i < count - 1 && (
                <button
                  type="button"
                  className="vv-fp-action"
                  onClick={() => handleMoveDown(i)}
                  title="Mover abajo"
                  disabled={saving}
                  data-testid={`button-preview-down-${i}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="vv-fp-action vv-fp-action-delete"
                onClick={() => handleRemove(i)}
                title="Quitar"
                disabled={saving}
                data-testid={`button-preview-remove-${i}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="vv-fp-slot-num">{i + 1}</div>
          </>
        ) : (
          <button
            type="button"
            className="vv-fp-add-btn"
            onClick={() => {
              if (available.length === 0) {
                setMsg({ type: "error", text: "No hay mas fotos en la galeria." });
                setTimeout(() => setMsg(null), 2500);
                return;
              }
              setPicking(true);
            }}
            disabled={saving || !canAdd}
            data-testid={`button-preview-add-${i}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Agregar</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="vv-fp-editor" data-testid="fotos-preview-editor">
      <div className="vv-fp-header">
        <div>
          <h3 className="vv-fp-title">Fotos de perfil (vista previa)</h3>
          <p className="vv-fp-subtitle">Estas fotos aparecen en tu perfil y en las tarjetas del listado. Maximo segun tu plan.</p>
        </div>
        <span className="vv-fp-counter" data-testid="preview-counter">{count} / {MAX_PREVIEW_SLOTS} usadas</span>
      </div>

      {msg && (
        <div
          className={msg.type === "error" ? "vv-form-error-box" : "vv-form-success-box"}
          style={{ fontSize: "13px", marginBottom: 10 }}
        >
          {msg.text}
        </div>
      )}

      <div className="vv-fp-grid">
        {slots}
      </div>

      {picking && (
        <div className="vv-fp-picker-overlay" onClick={() => setPicking(false)} data-testid="preview-picker-overlay">
          <div className="vv-fp-picker" onClick={(e) => e.stopPropagation()}>
            <div className="vv-fp-picker-header">
              <h4 className="vv-fp-picker-title">Seleccionar foto</h4>
              <button
                type="button"
                className="vv-fp-picker-close"
                onClick={() => setPicking(false)}
                data-testid="button-picker-close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {available.length === 0 ? (
              <p className="vv-fp-picker-empty">No hay mas fotos disponibles en tu galeria.</p>
            ) : (
              <div className="vv-fp-picker-grid">
                {available.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className="vv-fp-picker-item"
                    onClick={() => handlePick(url)}
                    data-testid={`button-pick-foto-${i}`}
                  >
                    <img
                      src={fixStorageUrl(url)}
                      alt={`Galeria ${i + 1}`}
                      className="vv-fp-picker-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.3";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {saving && (
        <div className="vv-fp-saving">Guardando...</div>
      )}
    </div>
  );
}
