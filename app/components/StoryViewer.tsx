"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fixStorageUrl } from "@/lib/fixStorageUrl";

interface CaptionJson {
  line1?: string;
  line2?: string;
  color1?: string;
  color2?: string;
}

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  caption_json?: CaptionJson | null;
  created_at: string;
  nombre: string;
  zona: string;
  avatar_url?: string;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `hace ${hrs}h`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} d`;
}

function parseCaptionJson(story: Story): { line1: string; line2: string; color1: string; color2: string } {
  if (story.caption_json && typeof story.caption_json === "object") {
    const cj = story.caption_json;
    return {
      line1: cj.line1 || "",
      line2: cj.line2 || "",
      color1: cj.color1 || "#ffffff",
      color2: cj.color2 || "#cfcfcf",
    };
  }
  if (story.caption && typeof story.caption === "string") {
    try {
      const parsed = JSON.parse(story.caption);
      if (parsed && typeof parsed === "object" && (parsed.line1 || parsed.text)) {
        return {
          line1: parsed.line1 || parsed.text || "",
          line2: parsed.line2 || "",
          color1: parsed.color1 || "#ffffff",
          color2: parsed.color2 || "#cfcfcf",
        };
      }
    } catch {}
    return { line1: story.caption, line2: "", color1: "#ffffff", color2: "#cfcfcf" };
  }
  return { line1: "", line2: "", color1: "#ffffff", color2: "#cfcfcf" };
}

export default function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = stories[index];
  const DURATION = 6000;

  const goNext = useCallback(() => {
    if (index < stories.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [index, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      setProgress(0);
    }
  }, [index]);

  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);

    if (story.media_type === "image") {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(elapsed / DURATION, 1);
        setProgress(pct);
        if (pct >= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          goNext();
        }
      }, 50);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index, story.media_type, goNext]);

  useEffect(() => {
    if (story.media_type === "video" && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [index, story.media_type]);

  function handleVideoTimeUpdate() {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  }

  function handleVideoEnded() {
    goNext();
  }

  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-story-close]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number;
    if ("touches" in e) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    const x = clientX - rect.left;
    if (x < rect.width * 0.3) {
      goPrev();
    } else {
      goNext();
    }
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [goNext, goPrev, onClose]);

  const { line1, line2, color1, color2 } = parseCaptionJson(story);
  const hasCaption = line1.trim().length > 0;
  const timeLabel = formatTimeAgo(story.created_at);
  const secondLine = line2 ? `${line2} · ${timeLabel}` : timeLabel;

  return (
    <div className="vv-sv-overlay" onClick={handleTap} data-testid="story-viewer">
      <div className="vv-sv-progress-bar">
        {stories.map((_, i) => (
          <div key={i} className="vv-sv-progress-seg">
            <div
              className="vv-sv-progress-fill"
              style={{
                width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div className="vv-sv-header">
        <div className="vv-sv-user">
          <div className="vv-sv-avatar">
            {story.avatar_url ? (
              <img src={fixStorageUrl(story.avatar_url)} alt="" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M20 21c0-3.3-3.6-6-8-6s-8 2.7-8 6" /></svg>
            )}
          </div>
          <div className="vv-sv-info">
            <span className="vv-sv-name">{story.nombre}</span>
            <span className="vv-sv-time">{story.zona} · {timeAgo(story.created_at)}</span>
          </div>
        </div>
        <button className="vv-sv-close" onClick={onClose} data-story-close data-testid="button-close-story" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="vv-sv-media">
        {story.media_type === "video" ? (
          <video
            ref={videoRef}
            src={fixStorageUrl(story.media_url)}
            className="vv-sv-media-content"
            playsInline
            muted
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
          />
        ) : (
          <img src={fixStorageUrl(story.media_url)} alt={story.nombre} className="vv-sv-media-content" />
        )}
      </div>

      {hasCaption && (
        <div
          className="vv-sv-caption-bubble"
          data-testid="story-caption-bubble"
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: color1,
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
            data-testid="story-caption-line1"
          >
            {line1}
          </div>
          {secondLine && (
            <div
              style={{
                fontSize: 13,
                color: color2,
                lineHeight: 1.3,
                marginTop: 2,
              }}
              data-testid="story-caption-line2"
            >
              {secondLine}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
