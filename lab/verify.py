"""Self-check suite for the analytic 4D scene.

These tests are the *claims* the interactive lab makes on screen, so they are
checked against exact geometry rather than eyeballed:

 1. projection and ray-casting are exact inverses
 2. a ray-cast hit re-projects onto the pixel it came from
 3. Umeyama recovers a known rigid transform
 4. static points agree across source frames (correspondence is consistent)
 5. dynamic points follow the analytic orbit (point tracks are physically right)
 6. D4RT's focal-length formula recovers the true intrinsics from decoded points
 7. decoding an ensemble in two reference frames recovers the true relative pose
 8. a depth map is just the z-component of the same query
"""
from __future__ import annotations

import numpy as np

import geometry as G
import scene as S

FAILS: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(("  PASS  " if ok else "  FAIL  ") + name + (f"   [{detail}]" if detail else ""))
    if not ok:
        FAILS.append(name)


def main() -> int:
    frames = [S.build_frame(t) for t in range(S.T)]
    rng = np.random.default_rng(0)

    print("\n[1] projection <-> ray casting")
    worst = 0.0
    for t in range(S.T):
        eye, R = S.camera_at(t)
        for _ in range(50):
            u, v = rng.uniform(0.05, 0.95), rng.uniform(0.05, 0.95)
            o, d = G.unproject(R, eye, S.INTR, u, v)
            for dist in (1.0, 3.7, 12.0):
                X = o + dist * d
                pu, pv, z = G.project(R, eye, S.INTR, X)
                worst = max(worst, abs(pu - u), abs(pv - v),
                            abs((X - o) @ d - dist), abs(z - dist * (d @ R[2])))
    check("round trip over 1200 rays", worst < 1e-9, f"max err {worst:.2e}")

    print("\n[2] hit point re-projects to its pixel")
    worst = 0.0
    hits = 0
    for _ in range(200):
        t = int(rng.integers(0, S.T))
        u, v = rng.uniform(0.1, 0.9), rng.uniform(0.1, 0.9)
        q = S.query(u, v, t, t, t, frames)
        if q is None:
            continue
        hits += 1
        pu, _, _ = S.project_world(q["world"], t)
        worst = max(worst, abs(pu - u))
    check(f"{hits} surface queries", worst < 1e-7, f"max err {worst:.2e}")

    print("\n[3] Umeyama recovers a known rigid transform")
    X = rng.normal(size=(200, 3)) * 2.0
    R_true = G.rodrigues([0.3, 1.0, -0.2], 0.9)
    t_true = np.array([0.4, -1.1, 2.6])
    R_est, t_est, _ = G.umeyama(X, (R_true @ X.T).T + t_true)
    check("rotation error", np.abs(R_est - R_true).max() < 1e-9, f"{np.abs(R_est - R_true).max():.2e}")
    check("translation error", np.abs(t_est - t_true).max() < 1e-9, f"{np.abs(t_est - t_true).max():.2e}")

    print("\n[4] a static world point decodes identically from any source frame")
    errs, chosen = [], None
    candidates = [(3.5, S.GROUND_Y, 2.6), (-3.3, S.GROUND_Y, -2.2), (1.1, S.GROUND_Y, -0.7),
                  (0.0, S.GROUND_Y, 3.4)]
    for cand in candidates:
        ground = np.array(cand)
        visible = True
        for t in range(S.T):
            p = S.project_world(ground, t)
            if p is None or not (0.02 < p[0] < 0.98 and 0.02 < p[1] < 0.98):
                visible = False
                break
            q = S.query(p[0], p[1], t, t, t, frames)
            if q is None or q["prim"] != 0:  # occluded by a block -> unusable
                visible = False
                break
        if visible:
            chosen = ground
            break
    if chosen is not None:
        for t in range(1, S.T):
            p0 = S.project_world(chosen, 0)
            pt = S.project_world(chosen, t)
            if p0 is None or pt is None:
                continue
            a = S.query(p0[0], p0[1], 0, 0, 0, frames)
            b = S.query(pt[0], pt[1], t, 0, 0, frames)
            if a is None or b is None:
                continue
            errs.append(np.linalg.norm(a["world"] - b["world"]))
    check(f"{len(errs)} frames, same ground point", len(errs) >= 6 and max(errs) < 1e-6,
          f"max {max(errs):.2e} m" if errs else "no unoccluded ground point")

    print("\n[5] a dynamic point track follows the planet rigidly")
    q0 = None
    c0 = S.planet_center(0)
    pix = S.project_world(c0, 0)
    if pix is not None:
        q0 = S.query(pix[0], pix[1], 0, 0, 0, frames)
    check("query hits the planet", q0 is not None and q0["prim"] == 4,
          S.PRIM_NAMES[q0["prim"]] if q0 else "miss")
    if q0 is not None and q0["prim"] == 4:
        radii, positions = [], []
        for tt in range(S.T):
            p = S.query(pix[0], pix[1], 0, tt, tt, frames)
            if p is None:
                continue
            positions.append(p["world"])
            radii.append(np.linalg.norm(p["world"] - S.planet_center(tt)))
        spread = float(np.ptp(radii)) if radii else 9.9
        travel = float(np.linalg.norm(positions[-1] - positions[0])) if len(positions) > 1 else 0.0
        check("rigid distance to the planet centre", len(radii) >= 7 and spread < 1e-9,
              f"{len(radii)}/8 frames, spread {spread:.2e} m")
        check("the point really moves over time", travel > 0.2, f"travelled {travel:.2f} m")

    print("\n[6] focal length recovered from decoded points (D4RT sec. 2.1)")
    focals = []
    for u in np.linspace(0.2, 0.8, 9):
        q = S.query(float(u), 0.5, 0, 0, 0, frames)
        if q is not None:
            f = G.focal_from_point(float(u), q["P"])
            if np.isfinite(f):
                focals.append(f)
    f_med = float(np.median(focals))
    f_gt = S.INTR["fx"] / S.W
    check(f"median over {len(focals)} samples", abs(f_med - f_gt) < 1e-6,
          f"{f_med:.6f} vs gt {f_gt:.6f}")

    print("\n[7] relative pose from a query ensemble (Umeyama)")
    us = (np.arange(7) + 0.5) / 7
    vs = (np.arange(5) + 0.5) / 5
    A, B = [], []
    for v in vs:
        for u in us:
            qi = S.query(float(u), float(v), 0, 0, 0, frames)
            qj = S.query(float(u), float(v), 0, 0, 4, frames)
            if qi is None or qj is None:
                continue
            A.append(qi["P"])
            B.append(qj["P"])
    R_est, t_est, _ = G.umeyama(np.array(B), np.array(A))
    _, Ri = S.camera_at(0)
    _, Rj = S.camera_at(4)
    R_gt = Ri @ Rj.T
    ang = np.degrees(np.arccos(np.clip((np.trace(R_est.T @ R_gt) - 1) / 2, -1, 1)))
    check(f"{len(A)} correspondences", ang < 1e-3, f"rotation err {ang:.2e} deg")

    print("\n[8] depth map == z of the decoded point")
    q = S.query(0.5, 0.68, 2, 2, 2, frames)
    z_proj = S.project_world(q["world"], 2)[2] if q else None
    check("pz equals the projection depth",
          q is not None and abs(q["P"][2] - z_proj) < 1e-9,
          f"{q['P'][2]:.4f} vs {z_proj:.4f}" if q else "miss")

    print("\n" + ("ALL CHECKS PASSED" if not FAILS else f"{len(FAILS)} FAILED: {FAILS}"))
    return 0 if not FAILS else 1


if __name__ == "__main__":
    raise SystemExit(main())

