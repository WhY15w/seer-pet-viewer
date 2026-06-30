#!/usr/bin/env python3
"""Export pskilltimeline_spines bundle to .spineclip directory."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import UnityPy


def extract_pet_id(bundle_path: Path, fallback_name: str = "") -> int:
    for pattern in (
        r"(?:pskilltimeline_)?spines?_?(\d+)",
        r"ppets?_?(\d+)",
    ):
        m = re.search(pattern, bundle_path.name, re.I)
        if m:
            return int(m.group(1))
    m = re.search(r"(\d+)", fallback_name)
    return int(m.group(1)) if m else 0


def collect_animations(env) -> list[str]:
    names: list[str] = []
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        data = obj.read()
        try:
            script = data.m_Script.read()
            if script.m_ClassName != "AnimationReferenceAsset":
                continue
            name = getattr(data, "animationName", None)
            if name:
                names.append(name)
        except Exception:
            continue
    return sorted(set(names))


def read_text_asset_bytes(asset) -> bytes:
    raw = asset.m_Script
    if isinstance(raw, bytes):
        return raw
    return raw.encode("utf-8", errors="surrogateescape")


def export_bundle(bundle_path: Path, out_dir: Path) -> None:
    env = UnityPy.load(str(bundle_path))

    skeleton_data = None
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        data = obj.read()
        try:
            if data.m_Script.read().m_ClassName != "SkeletonDataAsset":
                continue
        except Exception:
            continue
        skeleton_data = data
        break

    if not skeleton_data:
        raise RuntimeError(f"SkeletonDataAsset not found in {bundle_path}")

    skel_asset = skeleton_data.skeletonJSON.read()
    atlas_asset = skeleton_data.atlasAssets[0].read()
    atlas_file = atlas_asset.atlasFile.read()
    atlas_text = read_text_asset_bytes(atlas_file).decode("utf-8", errors="replace")
    skel_bytes = read_text_asset_bytes(skel_asset)

    textures_meta: list[dict] = []
    for obj in env.objects:
        if obj.type.name != "Texture2D":
            continue
        tex = obj.read()
        textures_meta.append(
            {
                "name": f"{tex.m_Name}.png",
                "width": tex.m_Width,
                "height": tex.m_Height,
            }
        )

    display_name = getattr(skeleton_data, "m_Name", "spine")
    meta = {
        "kind": "spine",
        "petId": extract_pet_id(bundle_path, display_name),
        "name": display_name,
        "atlasText": atlas_text,
        "animations": collect_animations(env),
        "scale": float(getattr(skeleton_data, "scale", 0.01)),
        "defaultMix": float(getattr(skeleton_data, "defaultMix", 0.2)),
        "textures": textures_meta,
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (out_dir / "skeleton.skel").write_bytes(skel_bytes)
    (out_dir / "atlas.atlas").write_text(atlas_text, encoding="utf-8")

    tex_dir = out_dir / "textures"
    tex_dir.mkdir(exist_ok=True)
    for obj in env.objects:
        if obj.type.name != "Texture2D":
            continue
        tex = obj.read()
        tex.image.save(tex_dir / f"{tex.m_Name}.png")

    print(f"Exported -> {out_dir}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: export_spineclip.py <bundle> [out_dir]", file=sys.stderr)
        sys.exit(1)
    bundle = Path(sys.argv[1])
    out = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else bundle.parent / f"{bundle.name}.spineclip"
    )
    export_bundle(bundle, out)


if __name__ == "__main__":
    main()
