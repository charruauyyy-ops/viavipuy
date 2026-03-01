"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface MediaItem {
  type: "image" | "video";
  url: string;
}

interface GalleryViewerProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function VideoPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setShowControls(true);
  }, [src]);

  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (ref.current && !ref.current.paused) setShowControls(false);
    }, 2500);
  }

  function togglePlay(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
      scheduleHide();
    } else {
      v.pause();
      setPlaying(false);
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
  }

  function seek(delta: number, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
    setShowControls(true);
    scheduleHide();
  }

  function onTimeUpdate() {
    if (!scrubbing && ref.current) setCurrent(ref.current.currentTime);
  }

  function onLoaded() {
    if (ref.current) setDuration(ref.current.duration || 0);
  }

  function onEnded() {
    setPlaying(false);
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  function handleTap() {
    setShowControls(true);
    scheduleHide();
  }

  function scrubFromEvent(clientX: number) {
    const bar = barRef.current;
    if (!bar || !ref.current) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    ref.current.currentTime = pct * (ref.current.duration || 0);
    setCurrent(ref.current.currentTime);
  }

  function onBarPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setScrubbing(true);
    scrubFromEvent(e.clientX);
    const onMove = (ev: PointerEvent) => scrubFromEvent(ev.clientX);
    const onUp = () => {
      setScrubbing(false);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      scheduleHide();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const remaining = duration - current;

  return (
    <div className="vvg-vp-wrap" ref={wrapRef} onClick={handleTap}>
      <video
        ref={ref}
        src={src}
        className="vvg-viewer-media"
        playsInline
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
        onEnded={onEnded}
        onClick={(e) => e.stopPropagation()}
        data-testid="video-gallery-full"
      />

      <div className={`vvg-vp-overlay${showControls ? " vvg-vp-show" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="vvg-vp-seek-btn vvg-vp-seek-left" onClick={(e) => seek(-10, e)} data-testid="button-video-back">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-3.6 0-6.5 2.9-6.5 6.5S8.9 21 12.5 21c2.5 0 4.7-1.4 5.8-3.5l-1.8-1c-.7 1.3-2.2 2.2-3.9 2.2-2.4 0-4.3-1.9-4.3-4.3s1.9-4.3 4.3-4.3c1.2 0 2.2.5 3 1.2L13 14h6V8l-2.2 2.2C15.5 8.9 14.1 8 12.5 8z"/></svg>
          <span>10</span>
        </button>

        <button className="vvg-vp-play-btn" onClick={togglePlay} data-testid="button-video-play">
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          )}
        </button>

        <button className="vvg-vp-seek-btn vvg-vp-seek-right" onClick={(e) => seek(10, e)} data-testid="button-video-forward">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 8c3.6 0 6.5 2.9 6.5 6.5S15.1 21 11.5 21c-2.5 0-4.7-1.4-5.8-3.5l1.8-1c.7 1.3 2.2 2.2 3.9 2.2 2.4 0 4.3-1.9 4.3-4.3s-1.9-4.3-4.3-4.3c-1.2 0-2.2.5-3 1.2L11 14H5V8l2.2 2.2C8.5 8.9 9.9 8 11.5 8z"/></svg>
          <span>10</span>
        </button>
      </div>

      <div className={`vvg-vp-bar${showControls ? " vvg-vp-show" : ""}`} onClick={(e) => e.stopPropagation()}>
        <span className="vvg-vp-time">{formatTime(current)}</span>
        <div
          className="vvg-vp-track"
          ref={barRef}
          onPointerDown={onBarPointerDown}
          data-testid="video-scrub-bar"
        >
          <div className="vvg-vp-track-fill" style={{ width: `${pct}%` }} />
          <div className="vvg-vp-track-thumb" style={{ left: `${pct}%` }} />
        </div>
        <span className="vvg-vp-time">-{formatTime(remaining)}</span>
      </div>
    </div>
  );
}

export default function GalleryViewer({ items, initialIndex, onClose }: GalleryViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStart = useRef<{ x: number; t: number } | null>(null);
  const touchDelta = useRef(0);

  const item = items[index];
  const total = items.length;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, onClose]);

  function goPrev() { if (index > 0) setIndex(index - 1); }
  function goNext() { if (index < total - 1) setIndex(index + 1); }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, t: Date.now() };
    touchDelta.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    touchDelta.current = e.touches[0].clientX - touchStart.current.x;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const threshold = 50;
    if (touchDelta.current < -threshold && index < total - 1) setIndex(i => i + 1);
    else if (touchDelta.current > threshold && index > 0) setIndex(i => i - 1);
    touchStart.current = null;
    touchDelta.current = 0;
  }, [index, total]);

  function handleTapZone(e: React.MouseEvent) {
    if (item.type === "video") return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    if (pct < 0.3) goPrev();
    else if (pct > 0.7) goNext();
  }

  return (
    <div
      className="vvg-viewer-overlay"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="gallery-viewer"
    >
      <button className="vvg-viewer-close" onClick={onClose} data-testid="button-gallery-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>

      {total > 1 && (
        <div className="vvg-viewer-counter" data-testid="text-gallery-counter">
          {index + 1} / {total}
        </div>
      )}

      {index > 0 && (
        <button className="vvg-viewer-arrow vvg-viewer-arrow-left" onClick={goPrev} data-testid="button-gallery-prev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      )}

      {index < total - 1 && (
        <button className="vvg-viewer-arrow vvg-viewer-arrow-right" onClick={goNext} data-testid="button-gallery-next">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}

      <div className="vvg-viewer-content" onClick={handleTapZone}>
        {item.type === "image" ? (
          <img
            key={`img-${index}`}
            src={item.url}
            alt={`Foto ${index + 1}`}
            className="vvg-viewer-media"
            draggable={false}
            data-testid="img-gallery-full"
          />
        ) : (
          <VideoPlayer key={`vid-${index}`} src={item.url} />
        )}
      </div>
    </div>
  );
}
