import { describe, expect, it } from "vitest";
import { boundsToQuadUvs } from "../src/mesh.js";

describe("mesh", () => {
  it("maps UV bounds to WebGL quad coordinates", () => {
    const quad = boundsToQuadUvs(0.8, 0.1, 0.2, 0.9);
    expect(quad[0]![0]).toBeCloseTo(0.2);
    expect(quad[0]![1]).toBeCloseTo(0.9);
    expect(quad[1]![0]).toBeCloseTo(0.8);
    expect(quad[1]![1]).toBeCloseTo(0.9);
    expect(quad[2]![0]).toBeCloseTo(0.8);
    expect(quad[2]![1]).toBeCloseTo(0.1);
    expect(quad[3]![0]).toBeCloseTo(0.2);
    expect(quad[3]![1]).toBeCloseTo(0.1);
  });
});
