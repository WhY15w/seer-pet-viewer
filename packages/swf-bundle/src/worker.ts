import "./buffer-setup.js";
import { MaterialResolver } from "./material.js";
import { parseBundleCore } from "./parse.js";
import { parsedBundleToJson } from "./clip-data.js";
import type { SwfMaterialState } from "./types.js";

export interface WorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  fileName: string;
  materials?: Record<string, SwfMaterialState>;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, buffer, fileName, materials } = event.data;
  try {
    const resolver = new MaterialResolver();
    if (materials) resolver.restore(materials);
    const core = await parseBundleCore(buffer, fileName, resolver);
    const meta = parsedBundleToJson(core);
    const rgba = core.atlasPixels.rgba;
    self.postMessage(
      {
        id,
        ok: true,
        meta,
        atlasWidth: core.atlasWidth,
        atlasHeight: core.atlasHeight,
        atlasRgba: rgba.buffer,
      },
      [rgba.buffer, buffer],
    );
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
