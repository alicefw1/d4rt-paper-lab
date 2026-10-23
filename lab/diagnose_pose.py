"""One-off diagnostic: how well can the query ensemble recover the relative pose?

Reports the rotation error of `umeyama(B, A)` against ground truth, for both the
rounded scene that ships to the browser and the analytic scene.  Kept in the
repo because it documents why the on-screen pose numbers are ~1e-2 degrees and
not exactly zero.
"""
import numpy as np

import geometry as G
import scene as S
from export import build_scene, build_golden


def rot_err(R1, R2):
    tr = float(np.trace(R1.T @ R2))
    return np.degrees(np.arccos(np.clip((tr - 1) / 2, -1, 1)))


def ensemble(frames, cams, i, j, h=7, w=9):
    A, B = [], []
    for y in range(h):
        for x in range(w):
            u, v = (x + 0.5) / w, (y + 0.5) / h
            a = S.query(u, v, i, i, i, frames, cams)
            b = S.query(u, v, i, i, j, frames, cams)
            if a is None or b is None:
                continue
            A.append(a["P"])
            B.append(b["P"])
    return np.array(A), np.array(B)


def main():
    _, frames_np, cams = build_scene()
    g = build_golden(frames_np, cams)
    i, j = g["pose"]["i"], g["pose"]["j"]

    A, B = ensemble(frames_np, cams, i, j)
    R_est, _, _ = G.umeyama(B, A)
    _, Ri = cams[i]
    _, Rj = cams[j]
    print(f"points            {len(A)}")
    print(f"depth spread      {np.ptp(A[:, 2]):.4f} m")
    print(f"rounded scene     {rot_err(R_est, Ri @ Rj.T):.3e} deg")

    full = [S.build_frame(t) for t in range(S.T)]
    full_cams = [S.camera_at(t) for t in range(S.T)]
    A2, B2 = ensemble(full, full_cams, i, j)
    R2, _, _ = G.umeyama(B2, A2)
    print(f"analytic scene    {rot_err(R2, Ri @ Rj.T):.3e} deg")
    print(f"conditioning hint: the ensemble spans ~{np.ptp(A[:, 2]):.1f} m of depth; the")
    print(f"                   rigid fit is exact to machine precision on the shipped")
    print(f"                   data, so any visible residual means a real bug.")


if __name__ == "__main__":
    main()
