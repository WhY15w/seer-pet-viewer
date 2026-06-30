import "./buffer-setup.js";
import { parseBundleCore } from "./parse.js";
import { parsedBundleToJson } from "./clip-data.js";

export interface WorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  fileName: string;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, buffer, fileName } = event.data;
  try {
    const core = await parseBundleCore(buffer, fileName);
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
