import type { SpineClipData, SpineClipJson } from "./types.js";
import { atlasPixelsToBitmap } from "./atlas.js";

export async function buildSpineClipData(
  meta: SpineClipJson,
  skeletonBytes: Uint8Array,
  textureBuffers: Array<{
    name: string;
    width: number;
    height: number;
    rgba: Uint8ClampedArray;
  }>,
): Promise<SpineClipData> {
  const textures = new Map<string, ImageBitmap>();
  for (const tex of textureBuffers) {
    textures.set(
      tex.name,
      await atlasPixelsToBitmap({
        width: tex.width,
        height: tex.height,
        rgba: tex.rgba,
      }),
    );
  }

  return {
    petId: meta.petId,
    name: meta.name,
    skeletonBytes,
    atlasText: meta.atlasText,
    textures,
    animations: meta.animations,
    scale: meta.scale,
    defaultMix: meta.defaultMix,
  };
}

export async function loadSpineClipPackage(
  meta: SpineClipJson,
  skeletonBytes: ArrayBuffer | Uint8Array,
  textureBitmaps: Map<string, ImageBitmap>,
): Promise<SpineClipData> {
  const skeleton =
    skeletonBytes instanceof Uint8Array
      ? skeletonBytes
      : new Uint8Array(skeletonBytes);
  return {
    petId: meta.petId,
    name: meta.name,
    skeletonBytes: skeleton,
    atlasText: meta.atlasText,
    textures: textureBitmaps,
    animations: meta.animations,
    scale: meta.scale,
    defaultMix: meta.defaultMix,
  };
}

export function closeSpineClipData(clip: SpineClipData): void {
  for (const bitmap of clip.textures.values()) {
    bitmap.close();
  }
}
