import { describe, expect, it } from "vitest";
import { bleedAtlasEdges, prepareAtlasRgba, zeroTransparentRgb } from "./atlas.js";

describe("zeroTransparentRgb", () => {
  it("clears RGB on fully transparent pixels", () => {
    const rgba = new Uint8ClampedArray([200, 100, 50, 0, 10, 20, 30, 255]);
    zeroTransparentRgb(rgba);
    expect(Array.from(rgba.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(rgba.slice(4))).toEqual([10, 20, 30, 255]);
  });
});

describe("prepareAtlasRgba", () => {
  it("zeros then bleeds opaque edge into transparent padding", () => {
    const w = 5;
    const h = 3;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let x = 1; x <= 3; x++) {
      const i = (1 * w + x) * 4;
      rgba[i] = 200;
      rgba[i + 1] = 100;
      rgba[i + 2] = 50;
      rgba[i + 3] = 255;
    }
    const leftPad = (1 * w + 0) * 4;
    rgba[leftPad] = 99;
    rgba[leftPad + 1] = 88;
    rgba[leftPad + 2] = 77;
    rgba[leftPad + 3] = 0;

    prepareAtlasRgba(rgba, w, h);
    expect(rgba[leftPad + 3]).toBe(0);
    expect(rgba[leftPad]).toBe(200);
    expect(rgba[leftPad + 1]).toBe(100);
    expect(rgba[leftPad + 2]).toBe(50);
  });
});

describe("bleedAtlasEdges", () => {
  it("spreads opaque edge RGB into transparent padding", () => {
    const w = 5;
    const h = 3;
    const rgba = new Uint8ClampedArray(w * h * 4);
    // 中间 3x1 不透明条
    for (let x = 1; x <= 3; x++) {
      const i = (1 * w + x) * 4;
      rgba[i] = 200;
      rgba[i + 1] = 100;
      rgba[i + 2] = 50;
      rgba[i + 3] = 255;
    }

    bleedAtlasEdges(rgba, w, h, 1);

    const leftPad = (1 * w + 0) * 4;
    expect(rgba[leftPad + 3]).toBe(0);
    expect(rgba[leftPad]).toBe(200);
    expect(rgba[leftPad + 1]).toBe(100);
    expect(rgba[leftPad + 2]).toBe(50);
  });
});
