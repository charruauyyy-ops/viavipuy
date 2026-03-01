"use client";

import { useState, useMemo } from "react";
import GalleryViewer, { type MediaItem } from "./GalleryViewer";
import VideoTilePreview from "./VideoTilePreview";

interface VerticalGalleryProps {
  mediaItems: MediaItem[];
}

export default function VerticalGallery({ mediaItems }: VerticalGalleryProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const sorted = useMemo(() => {
    const videos = mediaItems.filter(i => i.type === "video");
    const images = mediaItems.filter(i => i.type === "image");
    return [...videos, ...images];
  }, [mediaItems]);

  if (sorted.length === 0) return null;

  return (
    <>
      <div className="vvg-feed" data-testid="vertical-gallery">
        {sorted.map((item, i) =>
          item.type === "video" ? (
            <VideoTilePreview
              key={`media-${i}`}
              src={item.url}
              onClickOpen={() => setViewerIndex(i)}
            />
          ) : (
            <div
              key={`media-${i}`}
              className="vvg-feed-item"
              onClick={() => setViewerIndex(i)}
              data-testid={`gallery-item-${i}`}
            >
              <img
                src={item.url}
                alt={`Foto ${i + 1}`}
                className="vvg-feed-img"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ),
        )}
      </div>

      {viewerIndex !== null && (
        <GalleryViewer
          items={sorted}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
