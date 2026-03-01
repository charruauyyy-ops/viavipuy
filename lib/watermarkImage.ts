import sharp from "sharp";

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function isWatermarkable(mime: string): boolean {
  return ALLOWED_MIMES.includes(mime.toLowerCase());
}

export async function watermarkImage(
  inputBuffer: Buffer,
  originalMime: string
): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  let width = metadata.width || 800;
  let height = metadata.height || 600;

  if (width > 1800) {
    const ratio = 1800 / width;
    width = 1800;
    height = Math.round(height * ratio);
    image.resize(width, height, { fit: "inside", withoutEnlargement: true });
  }

  const targetTextWidthRatio = 0.48;
  const charCount = 6;
  const avgCharWidthFactor = 0.65;
  const targetTextWidth = width * targetTextWidthRatio;
  const fontSize = Math.round(targetTextWidth / (charCount * avgCharWidthFactor));
  const letterSpacing = Math.round(fontSize * 0.25);

  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="wblur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <text
        x="${width / 2}"
        y="${height / 2}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}"
        font-weight="bold"
        letter-spacing="${letterSpacing}"
        fill="white"
        fill-opacity="0.14"
        filter="url(#wblur)"
      >VIAVIP</text>
      <text
        x="${width / 2}"
        y="${height / 2}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}"
        font-weight="bold"
        letter-spacing="${letterSpacing}"
        fill="white"
        fill-opacity="0.15"
      >VIAVIP</text>
    </svg>
  `);

  const composited = image.composite([{ input: svgOverlay, top: 0, left: 0 }]);

  const isJpeg =
    originalMime === "image/jpeg" || originalMime === "image/jpg";
  const isPng = originalMime === "image/png";
  const isWebp = originalMime === "image/webp";

  let buffer: Buffer;
  let ext: string;
  let contentType: string;

  if (isPng) {
    buffer = await composited.png({ quality: 90 }).toBuffer();
    ext = "png";
    contentType = "image/png";
  } else if (isWebp) {
    buffer = await composited.webp({ quality: 90 }).toBuffer();
    ext = "webp";
    contentType = "image/webp";
  } else {
    buffer = await composited.jpeg({ quality: 90 }).toBuffer();
    ext = "jpg";
    contentType = "image/jpeg";
  }

  return { buffer, ext, contentType };
}
