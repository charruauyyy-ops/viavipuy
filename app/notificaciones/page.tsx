"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  kind: 'expiring' | 'expired' | 'info' | string;
  level: string | null;
  created_at: string;
  read_at: string | null;
  cta_label: string | null;
  cta_href: string | null;
  days_left: number | null;
  scope: string;
}

export default function NotificacionesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, scope, kind, days_left, title, message, level, cta_label, cta_href, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("notificaciones select error", error);
      setErrorMsg("Error cargando notificaciones");
      setLoading(false);
      return;
    }

    if (data) {
      setNotifications(data as Notification[]);
      
      // Auto-mark as read
      const unreadIds = data
        .filter((n: any) => !n.read_at)
        .map((n: any) => n.id);
      
      if (unreadIds.length > 0) {
        const nowIso = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from("notificaciones")
          .update({ read_at: nowIso })
          .in("id", unreadIds);
        
        if (!updateErr) {
          setNotifications(prev => prev.map(n => 
            unreadIds.includes(n.id) ? { ...n, read_at: nowIso } : n
          ));
        }
      }
    }
  };

  useEffect(() => {
    if (!mounted) return;

    async function init() {
      const supabase = getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        await fetchNotifications(data.user.id);
      }
      setLoading(false);
    }

    init();
  }, [mounted]);

  const markAllAsRead = async () => {
    if (!user || markingAll) return;
    setMarkingAll(true);
    
    const supabase = getSupabase();
    if (!supabase) {
      setMarkingAll(false);
      return;
    }

    const { error } = await supabase
      .from("notificaciones")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    }
    setMarkingAll(false);
  };

  if (!mounted || loading) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <p className="vv-form-loading">Cargando...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="vv-form-page">
        <div className="vv-form-container">
          <div className="vv-form-error-box">Debes iniciar sesión para ver tus notificaciones.</div>
          <Link href="/login" className="vv-form-link">Ir a Login</Link>
        </div>
      </main>
    );
  }

  const hasUnread = notifications.some(n => !n.read_at);

  return (
    <main className="vv-form-page">
      <div className="vv-form-container">
        <div className="vv-form-header">
          <h1 className="vv-form-title">Notificaciones</h1>
          {notifications.length > 0 && hasUnread && (
            <button 
              onClick={markAllAsRead}
              disabled={markingAll}
              className="vv-text-btn"
              style={{ fontSize: '13px', color: '#c6a75e', marginTop: '8px' }}
            >
              {markingAll ? "Marcando..." : "Marcar todas como leídas"}
            </button>
          )}
        </div>

        <div className="vv-notif-list">
          {errorMsg ? (
            <p style={{ textAlign: 'center', color: '#ff4d4f', padding: '40px 0' }}>{errorMsg}</p>
          ) : notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}>No tenés notificaciones</p>
          ) : (
            notifications.map((n) => {
              const titleColor =
                n.level === 'danger' ? '#ff4d4f' :
                n.level === 'warning' ? '#f0c75e' :
                (n.read_at ? '#ccc' : '#fff');

              return (
                <div 
                  key={n.id} 
                  className="vv-notif-item"
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #222',
                    backgroundColor: n.read_at ? 'transparent' : 'rgba(198, 167, 94, 0.05)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                    <h3 style={{ 
                      fontSize: '15px', 
                      fontWeight: 'bold', 
                      color: titleColor,
                      flex: 1
                    }}>
                      {n.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {n.kind === 'expired' && (
                        <span style={{ 
                          fontSize: '9px', 
                          backgroundColor: '#ff4d4f', 
                          color: '#fff', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          VENCIDA
                        </span>
                      )}
                      {!n.read_at && (
                        <span style={{ 
                          fontSize: '9px', 
                          backgroundColor: '#c6a75e', 
                          color: '#000', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          NUEVA
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '14px', color: '#eee', marginBottom: '8px', lineHeight: '1.4' }}>{n.message}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#555' }}>
                      {new Date(n.created_at).toLocaleString('es-UY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {n.cta_href && (
                      <Link 
                        href={n.cta_href}
                        className="vv-btn"
                        style={{ 
                          fontSize: '11px', 
                          padding: '4px 12px',
                          minHeight: 'auto',
                          height: 'auto'
                        }}
                      >
                        {n.cta_label || 'Ver'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Link href="/mi-cuenta" className="vv-form-back" style={{ marginTop: '24px' }}>
          Volver a Mi Cuenta
        </Link>
      </div>
    </main>
  );
}
