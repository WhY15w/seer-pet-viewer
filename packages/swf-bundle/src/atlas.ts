export interface AtlasPixels {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

/** unity-js 解码行序与 UnityPy/atlas.png 相反，需翻转为与 swfclip 一致 */
export function flipAtlasY(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    out.set(rgba.subarray(y * row, y * row + row), (height - 1 - y) * row);
  }
  return out;
}

/** 与导入 atlas.png 相同：主线程 canvas → PNG → createImageBitmap */
export async function atlasPixelsToBitmap(
  pixels: AtlasPixels,
): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");
  const data = new Uint8ClampedArray(pixels.rgba);
  ctx.putImageData(new ImageData(data, pixels.width, pixels.height), 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("图集 PNG 编码失败"));
    }, "image/png");
  });
  return createImageBitmap(blob);
}

export async function readBitmapPixels(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法读取图集像素");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, width, height).data;
}
