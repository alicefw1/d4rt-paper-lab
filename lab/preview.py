"""Debug-only: render a crude PNG of the synthetic scene so the framing can be
checked before touching the web app.  Usage: python preview.py [frame] [out.png]
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

import geometry as G
import scene as S


def main(t: int = 0, out: str = "preview.png", scale: int = 4) -> None:
    W, H = S.W * scale, S.H * scale
    img = Image.new("RGB", (W, H), (10, 14, 22))
    dr = ImageDraw.Draw(img)
    eye, R = S.camera_at(t)
    prims = S.build_frame(t)
    xyz, ids = S.bulk_points(t)

    depth = R @ (xyz - eye).T
    order = np.argsort(-depth[2])
    mats = S.build_material_points()
    for i in order:
        p = depth[:, i]
        if p[2] <= 0.05:
            continue
        u = (S.INTR["fx"] * p[0] / p[2] + S.INTR["cx"]) * scale
        v = (S.INTR["fy"] * p[1] / p[2] + S.INTR["cy"]) * scale
        if not (0 <= u < W and 0 <= v < H):
            continue
        col = mats[i]["color"]
        rgb = tuple(int(col[k:k + 2], 16) for k in (1, 3, 5))
        r = max(1, int(1.6 * scale / max(p[2] / 6.0, 0.4)))
        dr.ellipse([u - r, v - r, u + r, v + r], fill=rgb)

    # camera frusta for context
    for k in (0, 3, 7):
        e, Rk = S.camera_at(k)
        pk = Rk @ (e - eye)
        if pk[2] > 0.1:
            u = (S.INTR["fx"] * pk[0] / pk[2] + S.INTR["cx"]) * scale
            v = (S.INTR["fy"] * pk[1] / pk[2] + S.INTR["cy"]) * scale
            dr.ellipse([u - 5, v - 5, u + 5, v + 5], outline=(255, 90, 90), width=2)

    img.save(out)
    print("wrote", out, "| points:", len(xyz), "| eye:", np.round(eye, 2))


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 0,
         sys.argv[2] if len(sys.argv) > 2 else "preview.png")
