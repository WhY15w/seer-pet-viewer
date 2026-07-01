import type { ExportBackground } from "./types.js";
import { prequantizeForGif, quantize } from "./gifenc-safe.js";

const MAX_PALETTE_SAMPLES = 400_000;

function subsampleStep(
  width: number,
  height: number,
  frameCount: number,
): number {
  const perFrame = width * height;
  const total = perFrame * frameCount;
  if (total <= MAX_PALETTE_SAMPLES) return 1;
  return Math.ceil(Math.sqrt(total / MAX_PALETTE_SAMPLES));
}

/**
 * 从全部动画帧子采样合并像素，构建全局 GIF 调色盘。
 * 避免仅用首帧调色盘导致后续帧色差与索引跳动。
 */
export function buildGlobalGifPalette(
  frames: Uint8Array[],
  width: number,
  height: number,
  background: ExportBackground,
): number[][] {
  const useAlpha = background === "transparent";
  const pixelFormat = useAlpha ? "rgba4444" : "rgb565";
  const quantizeOptions = useAlpha
    ? { format: "rgba4444" as const, oneBitAlpha: true }
    : { format: "rgb565" as const };

  const step = subsampleStep(width, height, frames.length);
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const samplesPerFrame = cols * rows;
  const merged = new Uint8ClampedArray(samplesPerFrame * frames.length * 4);

  let offset = 0;
  for (const pixels of frames) {
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const si = (y * width + x) * 4;
        merged[offset++] = pixels[si]!;
        merged[offset++] = pixels[si + 1]!;
        merged[offset++] = pixels[si + 2]!;
        merged[offset++] = pixels[si + 3]!;
      }
    }
  }

  const samplePixels = merged.subarray(0, offset);
  const sampleCount = offset / 4;
  prequantizeForGif(samplePixels, sampleCount, 1, pixelFormat, useAlpha);
  return quantize(samplePixels, sampleCount, 1, 256, quantizeOptions);
}
