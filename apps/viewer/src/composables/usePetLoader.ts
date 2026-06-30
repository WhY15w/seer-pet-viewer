import { ref } from "vue";
import type { SwfClipData } from "@seer/swf-bundle";
import {
  parseBundleInWorker,
  loadSwfClipPackage,
  MaterialResolver,
  type SwfClipJson,
} from "@seer/swf-bundle";
import type { SpineClipData } from "@seer/spine-bundle";
import {
  detectBundleKind,
  parseSpineBundleInWorker,
  loadSpineClipPackage,
  type SpineClipJson,
} from "@seer/spine-bundle";

export type PetClip =
  | { type: "swf"; clip: SwfClipData }
  | { type: "spine"; clip: SpineClipData };

export function usePetLoader() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pet = ref<PetClip | null>(null);
  const parseMs = ref(0);
  const warnings = ref<string[]>([]);
  const materialResolver = new MaterialResolver();

  async function loadBundleFile(file: File) {
    loading.value = true;
    error.value = null;
    warnings.value = [];
    const t0 = performance.now();
    try {
      const buffer = await file.arrayBuffer();
      const kind = await detectBundleKind(buffer);
      if (kind === "video") {
        throw new Error("不支持的视频 bundle（VideoClip）");
      }
      if (kind === "unknown") {
        throw new Error("无法识别的 bundle 格式");
      }

      if (kind === "spine") {
        const clip = await parseSpineBundleInWorker(buffer.slice(0), file.name);
        pet.value = { type: "spine", clip };
      } else {
        const clip = await parseBundleInWorker(buffer.slice(0), file.name);
        pet.value = { type: "swf", clip };
        warnings.value = clip.materialWarnings;
      }
      parseMs.value = Math.round(performance.now() - t0);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      pet.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function loadSwfClipDir(files: FileList | File[]) {
    loading.value = true;
    error.value = null;
    const t0 = performance.now();
    try {
      const list = Array.from(files);
      const metaFile = list.find((f) => f.name === "meta.json");
      const atlasFile = list.find((f) => f.name === "atlas.png");
      if (!metaFile || !atlasFile) {
        throw new Error("预转换包需包含 meta.json 与 atlas.png");
      }
      const meta = JSON.parse(await metaFile.text()) as SwfClipJson;
      const data = await loadSwfClipPackage(meta, atlasFile);
      pet.value = { type: "swf", clip: data };
      warnings.value = data.materialWarnings;
      parseMs.value = Math.round(performance.now() - t0);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      pet.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function loadSpineClipDir(files: FileList | File[]) {
    loading.value = true;
    error.value = null;
    const t0 = performance.now();
    try {
      const list = Array.from(files);
      const metaFile = list.find((f) => f.name === "meta.json");
      const skeletonFile = list.find(
        (f) => f.name === "skeleton.skel" || f.name.endsWith(".skel"),
      );
      const atlasFile = list.find(
        (f) => f.name === "atlas.atlas" || f.name.endsWith(".atlas"),
      );
      if (!metaFile || !skeletonFile || !atlasFile) {
        throw new Error(
          "Spine 预转换包需包含 meta.json、skeleton.skel 与 atlas.atlas",
        );
      }
      const meta = JSON.parse(await metaFile.text()) as SpineClipJson;
      const skeletonBytes = new Uint8Array(await skeletonFile.arrayBuffer());
      if (!meta.atlasText) {
        meta.atlasText = await atlasFile.text();
      }

      const textures = new Map<string, ImageBitmap>();
      for (const texMeta of meta.textures) {
        const file =
          list.find((f) => f.name === texMeta.name) ??
          list.find((f) => f.name.endsWith(`/${texMeta.name}`));
        if (!file) {
          throw new Error(`缺少纹理文件: ${texMeta.name}`);
        }
        textures.set(texMeta.name, await createImageBitmap(file));
      }

      const data = await loadSpineClipPackage(meta, skeletonBytes, textures);
      pet.value = { type: "spine", clip: data };
      parseMs.value = Math.round(performance.now() - t0);
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      pet.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function loadMaterialBundleFile(file: File) {
    if (pet.value?.type !== "swf") return;
    const buffer = await file.arrayBuffer();
    const { loadMaterialBundle } = await import("@seer/swf-bundle/parse");
    const { count, warnings: w } = await loadMaterialBundle(
      buffer,
      materialResolver,
    );
    warnings.value = [...warnings.value, `已导入 ${count} 个材质`, ...w];
  }

  function reset() {
    pet.value = null;
    error.value = null;
    warnings.value = [];
    parseMs.value = 0;
  }

  return {
    loading,
    error,
    pet,
    parseMs,
    warnings,
    loadBundleFile,
    loadSwfClipDir,
    loadSpineClipDir,
    loadMaterialBundle: loadMaterialBundleFile,
    reset,
  };
}
