#!/usr/bin/env python3
"""UnityPy bundle analysis helper."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import UnityPy


def analyze(path: Path) -> dict:
    env = UnityPy.load(str(path))
    types: dict[str, int] = {}
    for obj in env.objects:
        t = obj.type.name
        types[t] = types.get(t, 0) + 1

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

    result: dict = {"path": str(path), "size": path.stat().st_size, "types": types}
    if not swf:
        result["error"] = "SwfClipAsset not found"
        return result

    result["frameRate"] = swf.FrameRate
    result["name"] = swf.Name
    result["sequences"] = {
        seq.Name: len(seq.Frames) for seq in swf.Sequences
    }

    for o in env.objects:
        if o.type.name == "Texture2D":
            t = o.read()
            result["atlas"] = {"name": t.m_Name, "width": t.m_Width, "height": t.m_Height}
            break

    return result


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: analyze_bundle.py <bundle> [bundle2 ...]", file=sys.stderr)
        sys.exit(1)
    for arg in sys.argv[1:]:
        info = analyze(Path(arg))
        print(json.dumps(info, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
