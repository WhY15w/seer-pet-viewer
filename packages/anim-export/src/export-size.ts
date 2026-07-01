/** @deprecated 使用 renderer 内的 computeSwfExportDimensions / computeSpineExportDimensions */
export function computeExportDimensions(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  scale: number,
  pad = 2,
  atlasWidth = 2048,
  atlasHeight = 1024,
): { width: number; height: number; pixelsPerUnit: number } {
  const bw = bounds.maxX - bounds.minX || 1;
  const bh = bounds.maxY - bounds.minY || 1;
  const pixelsPerUnitX = atlasWidth * scale;
  const pixelsPerUnitY = atlasHeight * scale;
  return {
    width: Math.max(1, Math.ceil(bw * pixelsPerUnitX) + pad * 2),
    height: Math.max(1, Math.ceil(bh * pixelsPerUnitY) + pad * 2),
    pixelsPerUnit: pixelsPerUnitX,
  };
}
