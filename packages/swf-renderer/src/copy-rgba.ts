/** 从 Pixi extract 等可能共享大 buffer 的视图中复制紧凑 RGBA */
export function copyRgbaPixels(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const w = Math.floor(width);
  const h = Math.floor(height);
  const expected = w * h * 4;
  const out = new Uint8Array(expected);
  out.set(pixels.subarray(0, expected));
  return out;
}
