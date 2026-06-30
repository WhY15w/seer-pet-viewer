import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { boundsToQuadUvs, unpackUV } from "../src/mesh.js";

const exampleDir = resolve(import.meta.dirname, "../../../examples/ppets_70.swfclip");
const QUAD0_UV1 = 421494143;
const QUAD0_UV2 = 499092863;

describe("swf-bundle", () => {
  it("exported swfclip meta matches expected structure", () => {
    const meta = JSON.parse(
      readFileSync(resolve(exampleDir, "meta.json"), "utf-8"),
    );
    expect(meta.petId).toBe(70);
    expect(meta.frameRate).toBe(24);
    expect(meta.sequences.map((s: { name: string }) => s.name)).toEqual([
      "standby",
      "attack",
      "sa",
      "cp",
      "hited",
    ]);
    expect(meta.sequences[0].frames).toHaveLength(29);
    expect(meta.atlasWidth).toBe(2048);
    const frame0 = meta.sequences[0].frames[0];
    expect(frame0.indices).toHaveLength(36);
    expect(frame0.positions.length).toBeGreaterThan(0);
  });

  it("exported meta stores WebGL UV coordinates", () => {
    const meta = JSON.parse(
      readFileSync(resolve(exampleDir, "meta.json"), "utf-8"),
    );
    const [u1, v1] = unpackUV(QUAD0_UV1);
    const [u2, v2] = unpackUV(QUAD0_UV2);
    const expected = boundsToQuadUvs(u1, v1, u2, v2);
    const frameUvs = meta.sequences[0].frames[0].uvs;
    for (let q = 0; q < 4; q++) {
      expect(frameUvs[q * 2]).toBeCloseTo(expected[q]![0], 5);
      expect(frameUvs[q * 2 + 1]).toBeCloseTo(expected[q]![1], 5);
    }
    expect(meta.atlasOriented).toBe(true);
  });
});
