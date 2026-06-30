#!/usr/bin/env python3
"""Export ppets bundle to .swfclip directory (meta.json + atlas.png)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import UnityPy

UV_DIVISOR = 65536.0
FCOLOR_PRECISION = 1 / 512


def unpack_uv(pack: int) -> tuple[float, float]:
    u = ((pack >> 16) & 0xFFFF) / UV_DIVISOR
    v = (pack & 0xFFFF) / UV_DIVISOR
    return u, v


def bounds_to_quad_uvs(
    u1: float, v1: float, u2: float, v2: float
) -> list[tuple[float, float]]:
    u_min, u_max = min(u1, u2), max(u1, u2)
    v_min, v_max = min(v1, v2), max(v1, v2)
    return [
        (u_min, 1.0 - v_min),
        (u_max, 1.0 - v_min),
        (u_max, 1.0 - v_max),
        (u_min, 1.0 - v_max),
    ]


def unpack_fcolor(pack0: int, pack1: int) -> list[float]:
    def signed(v: int) -> int:
        s = v & 0xFFFF
        return s - 0x10000 if s > 0x7FFF else s

    return [
        signed(pack0 >> 16) * FCOLOR_PRECISION,
        signed(pack0 & 0xFFFF) * FCOLOR_PRECISION,
        signed(pack1 >> 16) * FCOLOR_PRECISION,
        signed(pack1 & 0xFFFF) * FCOLOR_PRECISION,
    ]


def build_frame_mesh(mesh_data) -> dict:
    positions: list[float] = []
    uvs: list[float] = []
    add_colors: list[float] = []
    mul_colors: list[float] = []
    indices: list[int] = []

    for i in range(0, len(mesh_data.UVs), 2):
        u1, v1 = unpack_uv(mesh_data.UVs[i])
        u2, v2 = unpack_uv(mesh_data.UVs[i + 1])
        quad_uvs = bounds_to_quad_uvs(u1, v1, u2, v2)
        vi = i // 2
        for q in range(4):
            vert = mesh_data.Vertices[vi * 4 + q]
            positions.extend([vert.x, vert.y])
            u, v = quad_uvs[q]
            uvs.extend([u, v])
        add = unpack_fcolor(
            mesh_data.AddColors[vi * 2],
            mesh_data.AddColors[vi * 2 + 1],
        )
        mul = unpack_fcolor(
            mesh_data.MulColors[vi * 2],
            mesh_data.MulColors[vi * 2 + 1],
        )
        for _ in range(4):
            add_colors.extend(add)
            mul_colors.extend(mul)

    sub_meshes = []
    for sm in mesh_data.SubMeshes:
        index_start = len(indices)
        start_vertex = sm.StartVertex
        for _ in range(0, sm.IndexCount, 6):
            indices.extend(
                [
                    start_vertex + 2,
                    start_vertex + 1,
                    start_vertex + 0,
                    start_vertex + 0,
                    start_vertex + 3,
                    start_vertex + 2,
                ]
            )
            start_vertex += 4
        sub_meshes.append(
            {
                "startVertex": sm.StartVertex,
                "indexCount": sm.IndexCount,
                "indexStart": index_start,
                "material": {
                    "blendMode": "normal",
                    "shaderKind": "simple",
                    "srcBlend": 1,
                    "dstBlend": 10,
                    "blendOp": 0,
                    "stencilId": 0,
                },
            }
        )

    return {
        "positions": positions,
        "uvs": uvs,
        "addColors": add_colors,
        "mulColors": mul_colors,
        "indices": indices,
        "subMeshes": sub_meshes,
    }


def export_bundle(bundle_path: Path, out_dir: Path) -> None:
    env = UnityPy.load(str(bundle_path))
    swf = None
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        d = obj.read()
        try:
            if d.m_Script.read().m_ClassName != "SwfClipAsset":
                continue
        except Exception:
            continue
        swf = d
        break
    if not swf:
        raise RuntimeError(f"SwfClipAsset not found in {bundle_path}")

    texture = next(o.read() for o in env.objects if o.type.name == "Texture2D")
    img = texture.image

    pet_id = 0
    m = __import__("re").search(r"ppets?_?(\d+)", bundle_path.name, __import__("re").I)
    if m:
        pet_id = int(m.group(1))

    meta = {
        "petId": pet_id,
        "name": swf.Name,
        "frameRate": swf.FrameRate,
        "atlasWidth": texture.m_Width,
        "atlasHeight": texture.m_Height,
        "materialWarnings": [],
        "atlasOriented": True,
        "sequences": [],
    }

    for seq in swf.Sequences:
        frames = []
        for frame in seq.Frames:
            frames.append(
                {
                    "labels": list(frame.Labels or []),
                    **build_frame_mesh(frame.MeshData),
                }
            )
        meta["sequences"].append({"name": seq.Name, "frames": frames})

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False), encoding="utf-8"
    )
    img.save(out_dir / "atlas.png")
    print(f"Exported -> {out_dir}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: export_swfclip.py <bundle> [out_dir]", file=sys.stderr)
        sys.exit(1)
    bundle = Path(sys.argv[1])
    out = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else bundle.parent / f"{bundle.name}.swfclip"
    )
    export_bundle(bundle, out)


if __name__ == "__main__":
    main()
