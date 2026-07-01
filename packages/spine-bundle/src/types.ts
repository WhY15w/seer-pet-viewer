export interface SpineTextureMeta {
  name: string;
  width: number;
  height: number;
}

export interface SpineClipJson {
  petId: number;
  name: string;
  atlasText: string;
  animations: string[];
  scale: number;
  defaultMix: number;
  textures: SpineTextureMeta[];
}

export interface SpineClipData {
  petId: number;
  name: string;
  skeletonBytes: Uint8Array;
  atlasText: string;
  textures: Map<string, ImageBitmap>;
  animations: string[];
  scale: number;
  defaultMix: number;
}

export interface ParsedSpineBundle {
  petId: number;
  name: string;
  skeletonBytes: Uint8Array;
  atlasText: string;
  texturePixels: Array<{
    name: string;
    width: number;
    height: number;
    rgba: Uint8ClampedArray;
  }>;
  animations: string[];
  scale: number;
  defaultMix: number;
}

export type BundleKind = "swf" | "spine" | "video" | "unknown";

export const SPINE_SEQUENCE_LABELS: Record<string, string> = {
  await: "待机",
  standby: "待机",
  attack: "物攻",
  sa: "特攻",
  cp: "属性",
  hited: "受击",
  appear: "出场",
  transform: "变身",
  hidemove: "第五技能",
};

export const SPINE_PREVIEW_FPS = 30;
