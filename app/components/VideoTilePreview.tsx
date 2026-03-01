"use client";

import { useRef, useEffect, useCallback } from "react";

interface VideoTilePreviewProps {
  src: string;
  onClickOpen: () => void;
}

const PREVIEW_DURATION = 10000;
const VISIBILITY_THRESHOLD = 0.6;

export default function VideoTilePreview({ src, onClickOpen }: VideoTilePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const clearPreviewTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopAndReset = useCallback(() => {
    clearPreviewTimeout();
    const vid = videoRef.current;
    if (vid) {
      vid.pause();
      vid.currentTime = 0;
    }
  }, [clearPreviewTimeout]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const vid = videoRef.current;
    if (!wrap || !vid) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
          clearPreviewTimeout();
          timeoutRef.current = setTimeout(() => {
            vid.pause();
            vid.currentTime = 0;
          }, PREVIEW_DURATION);
        } else {
          stopAndReset();
        }
      },
      { threshold: VISIBILITY_THRESHOLD },
    );

    observerRef.current.observe(wrap);

    return () => {
      observerRef.current?.disconnect();
      clearPreviewTimeout();
    };
  }, [src, clearPreviewTimeout, stopAndReset]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      stopAndReset();
      onClickOpen();
    },
    [onClickOpen, stopAndReset],
  );

  return (
    <div ref={wrapRef} className="vvg-feed-item" onClick={handleClick} style={{ cursor: "pointer" }}>
      <video
        ref={videoRef}
        src={src}
        className="vvg-feed-video"
        preload="metadata"
        playsInline
        muted
        loop={false}
      />
      <div className="vvg-feed-play">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}
