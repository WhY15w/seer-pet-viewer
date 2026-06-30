import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadAssetBundle, AssetType } from "@arkntools/unity-js";

const buf = readFileSync(resolve("../../ppets_70"));
const bundle = await loadAssetBundle(buf);

for (const obj of bundle.objects) {
  if (obj.type !== AssetType.MonoBehaviour) continue;
  const mb = obj;
  const script = mb.script.object;
  if (script?.className !== "SwfClipAsset") continue;

  const tree = mb.getTypeTree();
  console.log("FrameRate:", tree.FrameRate);
  console.log("Name:", tree.Name);
  const sequences = tree.Sequences;
  for (const seq of sequences) {
    console.log(`  ${seq.Name}: ${seq.Frames.length} frames`);
  }
  const firstFrame = sequences[0].Frames[0];
  console.log(
    "frame0 verts:",
    firstFrame.MeshData.Vertices.length,
    "uvs:",
    firstFrame.MeshData.UVs.length,
  );
  break;
}
