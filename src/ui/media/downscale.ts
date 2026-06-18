export interface DownscaleResult {
  blob: Blob;
  width?: number;
  height?: number;
  mime: string;
}

export function isImageMime(mime: string): boolean {
  return typeof mime === "string" && mime.startsWith("image/") && mime !== "image/svg+xml";
}

function passthrough(file: File): DownscaleResult {
  return { blob: file, mime: file.type };
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    } catch {
      resolve(null);
    }
  });
}

export async function downscaleImage(
  file: File,
  maxDim: number = 1280,
  quality: number = 0.82,
): Promise<DownscaleResult> {
  if (!isImageMime(file.type) || typeof createImageBitmap !== "function") {
    return passthrough(file);
  }

  let bmp: ImageBitmap | null = null;
  try {
    bmp = await createImageBitmap(file);
    const sw = bmp.width;
    const sh = bmp.height;
    if (!sw || !sh) return passthrough(file);

    const longest = Math.max(sw, sh);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));

    let blob: Blob | null = null;

    if (typeof OffscreenCanvas === "function") {
      const off = new OffscreenCanvas(w, h);
      const ctx = off.getContext("2d");
      if (!ctx) return passthrough(file);
      ctx.drawImage(bmp, 0, 0, w, h);
      if (typeof off.convertToBlob === "function") {
        blob = await off.convertToBlob({ type: "image/jpeg", quality });
      }
    }

    if (!blob && typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return passthrough(file);
      ctx.drawImage(bmp, 0, 0, w, h);
      blob = await encodeCanvas(canvas, quality);
    }

    if (!blob) return passthrough(file);
    return { blob, width: w, height: h, mime: "image/jpeg" };
  } catch {
    return passthrough(file);
  } finally {
    bmp?.close?.();
  }
}
