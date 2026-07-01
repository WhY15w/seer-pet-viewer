import { copyRgbaPixels } from "./pixels.js";
import { encodeAnimationWasm } from "./wasm-webp-loader.js";
import type { CapturedFrame } from "./types.js";

export interface WebpEncodeOptions {
  width: number;
  height: number;
  fps: number;
  loop: boolean;
  quality?: number;
}

export async function encodeAnimatedWebp(
  frames: CapturedFrame[],
  options: WebpEncodeOptions,
): Promise<Uint8Array> {
  const { width, height, fps, quality = 88 } = options;
  const delayMs = Math.max(1, Math.round(1000 / fps));
  const pixelBytes = width * height * 4;
  const hasAlpha = frames.some((frame) => {
    for (let i = 3; i < pixelBytes; i += 4) {
      if (frame.pixels[i]! < 255) return true;
    }
    return false;
  });

  const webpFrames = frames.map((frame) => {
    if (frame.width !== width || frame.height !== height) {
      throw new Error("导出帧尺寸不一致");
    }
    return {
      data: copyRgbaPixels(frame.pixels, width, height),
      duration: delayMs,
      config: { lossless: 0, quality },
    };
  });

  const bytes = await encodeAnimationWasm(width, height, hasAlpha, webpFrames);
  if (!bytes) {
    throw new Error("WebP 编码失败");
  }
  return bytes;
}
