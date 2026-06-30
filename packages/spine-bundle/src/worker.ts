import "./buffer-setup.js";
import { parseSpineBundleCore, parsedSpineToJson } from "./parse.js";

export interface SpineWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  fileName: string;
}

self.onmessage = async (event: MessageEvent<SpineWorkerRequest>) => {
  const { id, buffer, fileName } = event.data;
  try {
    const core = await parseSpineBundleCore(buffer, fileName);
    const meta = parsedSpineToJson(core);
    const skeletonBytes = core.skeletonBytes.slice().buffer;
    const transferables: ArrayBuffer[] = [buffer, skeletonBytes];

    const textures = core.texturePixels.map((tex) => {
      const rgba = tex.rgba.slice().buffer;
      transferables.push(rgba);
      return {
        name: tex.name,
        width: tex.width,
        height: tex.height,
        rgba,
      };
    });

    self.postMessage(
      {
        id,
        ok: true,
        meta,
        skeletonBytes,
        textures,
      },
      transferables,
    );
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
