export interface AtlasPixels {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

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

export async function atlasPixelsToBitmap(
  pixels: AtlasPixels,
): Promise<ImageBitmap> {
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(pixels.rgba), pixels.width, pixels.height),
    0,
    0,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("纹理 PNG 编码失败"));
    }, "image/png");
  });
  return createImageBitmap(blob);
}

export function imgBitMapToPixels(img: {
  data: ArrayBuffer;
  width: number;
  height: number;
}): AtlasPixels {
  const rgba = flipAtlasY(
    new Uint8ClampedArray(img.data),
    img.width,
    img.height,
  );
  return { width: img.width, height: img.height, rgba };
}
