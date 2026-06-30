#!/usr/bin/env python3
"""Compare unity-js raw atlas vs exported PNG."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
w, h = 2048, 1024
raw_path = root / "tools" / ".atlas-js.raw"
png_path = root / "examples" / "ppets_70.swfclip" / "atlas.png"
meta_path = root / "examples" / "ppets_70.swfclip" / "meta.json"


def load_raw_rgba(path: Path, width: int, height: int) -> np.ndarray:
    data = np.frombuffer(path.read_bytes(), dtype=np.uint8).reshape(height, width, 4)
    return data


def main() -> None:
    oriented_path = root / "tools" / ".atlas-oriented.raw"
    if not oriented_path.exists():
        oriented_path = root / "tools" / ".atlas-js-flip.raw"
    js = load_raw_rgba(oriented_path, w, h)
    png = np.array(Image.open(png_path).convert("RGBA"))

    print("shape", js.shape, png.shape)
    print("equal", np.array_equal(js, png))
    print("equal flip-v", np.array_equal(np.flipud(js), png))
    print("equal flip-h", np.array_equal(np.fliplr(js), png))
    print("equal rot180", np.array_equal(np.rot90(js, 2), png))

    if not np.array_equal(js, png):
        diff = np.any(js != png, axis=2)
        print("diff pixels", diff.sum())
        # sample corners
        for name, arr in [
            ("js TL", js[0, 0]),
            ("png TL", png[0, 0]),
            ("js BL", js[-1, 0]),
            ("png BL", png[-1, 0]),
        ]:
            print(name, arr)


if __name__ == "__main__":
    main()
