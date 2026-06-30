import type { SpineClipData, SpineClipJson } from "./types.js";
import { buildSpineClipData } from "./clip-data.js";

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<
  number,
  { resolve: (v: SpineClipData) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = async (event: MessageEvent) => {
      const { id, ok, meta, skeletonBytes, textures, error } = event.data;
      const handlers = pending.get(id);
      if (!handlers) return;
      pending.delete(id);

      if (!ok) {
        handlers.reject(new Error(error ?? "Spine 解析失败"));
        return;
      }

      const textureBuffers = (textures as Array<{
        name: string;
        width: number;
        height: number;
        rgba: ArrayBuffer;
      }>).map((tex) => ({
        name: tex.name,
        width: tex.width,
        height: tex.height,
        rgba: new Uint8ClampedArray(tex.rgba),
      }));

      const clip = await buildSpineClipData(
        meta as SpineClipJson,
        new Uint8Array(skeletonBytes as ArrayBuffer),
        textureBuffers,
      );
      handlers.resolve(clip);
    };
    worker.onerror = (e) => {
      for (const [, h] of pending) h.reject(new Error(e.message));
      pending.clear();
    };
  }
  return worker;
}

export function parseSpineBundleInWorker(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<SpineClipData> {
  const id = ++requestId;
  const copy = buffer.slice(0);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, buffer: copy, fileName }, [copy]);
  });
}

export function terminateSpineParserWorker(): void {
  worker?.terminate();
  worker = null;
  pending.clear();
}
