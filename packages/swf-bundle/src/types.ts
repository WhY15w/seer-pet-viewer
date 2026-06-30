export type SwfBlendMode =
  | "normal"
  | "layer"
  | "multiply"
  | "screen"
  | "lighten"
  | "darken"
  | "difference"
  | "add"
  | "subtract"
  | "invert"
  | "overlay"
  | "hardlight";

export type SwfShaderKind =
  | "simple"
  | "simpleGrab"
  | "incrMask"
  | "decrMask"
  | "masked"
  | "maskedGrab";

export interface SwfMaterialState {
  blendMode: SwfBlendMode;
  shaderKind: SwfShaderKind;
  srcBlend: number;
  dstBlend: number;
  blendOp: number;
  stencilId: number;
  grabBlend?: SwfBlendMode;
}

export interface SwfSubMesh {
  startVertex: number;
  indexCount: number;
  indexStart: number;
  material: SwfMaterialState;
}

export interface SwfFrameMesh {
  positions: Float32Array;
  uvs: Float32Array;
  addColors: Float32Array;
  mulColors: Float32Array;
  indices: Uint16Array;
  subMeshes: SwfSubMesh[];
}

export interface SwfFrame {
  labels: string[];
  mesh: SwfFrameMesh;
}

export interface SwfSequence {
  name: string;
  frames: SwfFrame[];
}

export interface SwfClipData {
  petId: number;
  name: string;
  frameRate: number;
  atlasWidth: number;
  atlasHeight: number;
  atlas: ImageBitmap;
  sequences: SwfSequence[];
  materialWarnings: string[];
}

export interface ParsedSwfBundle {
  petId: number;
  name: string;
  frameRate: number;
  atlasWidth: number;
  atlasHeight: number;
  atlasPixels: import("./atlas.js").AtlasPixels;
  sequences: SwfSequence[];
  materialWarnings: string[];
}

export interface SwfClipJson {
  petId: number;
  name: string;
  frameRate: number;
  atlasWidth: number;
  atlasHeight: number;
  sequences: Array<{
    name: string;
    frames: Array<{
      labels: string[];
      positions: number[];
      uvs: number[];
      addColors: number[];
      mulColors: number[];
      indices: number[];
      subMeshes: SwfSubMesh[];
    }>;
  }>;
  materialWarnings: string[];
  /** 为 true 时表示图集为原始朝向，UV 已转换为 WebGL 坐标 */
  atlasOriented?: boolean;
}

export const SEQUENCE_LABELS: Record<string, string> = {
  standby: "待机",
  attack: "出招",
  sa: "必杀",
  cp: "特性",
  hited: "受击",
};
