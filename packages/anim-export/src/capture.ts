export {
  computeTightExportSize,
  cropRgbaPixels,
  findAlphaBounds,
  pixelRectHeight,
  pixelRectWidth,
  scalePixelRect,
  unionPixelRects,
  DEFAULT_ALPHA_THRESHOLD,
} from "./alpha-bounds.js";
export type { PixelRect } from "./alpha-bounds.js";
export {
  computeFittedCanvasLayout,
  finalizeExportPixels,
  mergeAlphaBounds,
  planTightExport,
  PROBE_MAX_SIDE,
  MAX_EXPORT_SIDE,
} from "./tight-export.js";
export type { FittedCanvasLayout, TightExportPlan, VertexBounds } from "./tight-export.js";
