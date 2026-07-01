export interface PixelRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const DEFAULT_ALPHA_THRESHOLD = 8;

export function pixelRectWidth(rect: PixelRect): number {
  return rect.maxX - rect.minX + 1;
}

export function pixelRectHeight(rect: PixelRect): number {
  return rect.maxY - rect.minY + 1;
}

/** 扫描 RGBA（顶左原点）中非透明像素紧包围盒 */
export function findAlphaBounds(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
): PixelRect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const rowBytes = width * 4;

  for (let y = 0; y < height; y++) {
    const row = y * rowBytes;
    for (let x = 0; x < width; x++) {
      const a = pixels[row + x * 4 + 3]!;
      if (a <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

export function unionPixelRects(
  a: PixelRect | null,
  b: PixelRect | null,
): PixelRect | null {
  if (!a) return b;
  if (!b) return a;
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function scalePixelRect(rect: PixelRect, factor: number): PixelRect {
  if (factor === 1) return { ...rect };
  return {
    minX: Math.floor(rect.minX * factor),
    minY: Math.floor(rect.minY * factor),
    maxX: Math.ceil((rect.maxX + 1) * factor) - 1,
    maxY: Math.ceil((rect.maxY + 1) * factor) - 1,
  };
}

export function cropRgbaPixels(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  _height: number,
  rect: PixelRect,
): { pixels: Uint8Array; width: number; height: number } {
  const cropW = pixelRectWidth(rect);
  const cropH = pixelRectHeight(rect);
  const out = new Uint8Array(cropW * cropH * 4);
  const rowBytes = width * 4;
  const cropRowBytes = cropW * 4;

  for (let y = 0; y < cropH; y++) {
    const srcY = rect.minY + y;
    const srcStart = srcY * rowBytes + rect.minX * 4;
    out.set(
      pixels.subarray(srcStart, srcStart + cropRowBytes),
      y * cropRowBytes,
    );
  }

  return { pixels: out, width: cropW, height: cropH };
}

export function computeTightExportSize(
  content: PixelRect,
  scale: number,
  pad: number,
  maxSide: number,
): { width: number; height: number } {
  const contentW = pixelRectWidth(content);
  const contentH = pixelRectHeight(content);
  let width = Math.max(1, Math.ceil(contentW * scale) + pad * 2);
  let height = Math.max(1, Math.ceil(contentH * scale) + pad * 2);

  const longest = Math.max(width, height);
  if (longest > maxSide) {
    const ratio = maxSide / longest;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  return { width, height };
}
