export function fixStorageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.includes("/storage/v1/object/public/verificaciones/media/")) {
    return url.replace(
      "/storage/v1/object/public/verificaciones/media/",
      "/storage/v1/object/public/media/media/"
    );
  }
  if (url.includes("/storage/v1/object/public/verificaciones/stories/")) {
    return url.replace(
      "/storage/v1/object/public/verificaciones/stories/",
      "/storage/v1/object/public/media/stories/"
    );
  }
  return url;
}
