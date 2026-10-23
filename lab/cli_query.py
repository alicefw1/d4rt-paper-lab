"""Command-line tour of the query interface -- the Python counterpart of the
interactive lab.

    python cli_query.py            # run all five Table-1 tasks
    python cli_query.py --track    # just the point track

Everything here goes through the same `scene.query()` used to generate the
browser's golden answers, so what you print is exactly what the web app shows.
"""
from __future__ import annotations

import argparse
import sys

import numpy as np

import geometry as G
import scene as S


def hr(title: str) -> None:
    print(f"\n{title}\n" + "-" * len(title))


def point_track(u=0.30, v=0.56, t_src=0) -> None:
    hr(f"point track  q = (u={u}, v={v}, t_src={t_src}, t_tgt=k, t_cam={t_src})")
    q0 = S.query(u, v, t_src, t_src, t_src)
    if q0 is None:
        print("that pixel looks at the sky")
        return
    print(f"source hit: {S.PRIM_NAMES[q0['prim']]}   depth along ray {q0['depth_src']:.3f} m")
    print(f"{'k':>2}  {'Px':>8} {'Py':>8} {'Pz':>8}   |P| to t_src camera")
    for k in range(S.T):
        q = S.query(u, v, t_src, k, t_src)
        if q is None:
            continue
        print(f"{k:>2}  {q['P'][0]:8.3f} {q['P'][1]:8.3f} {q['P'][2]:8.3f}   {np.linalg.norm(q['P']):.3f}")


def point_cloud(t_src=0, res=24) -> None:
    hr(f"point cloud  q = (u=1..W, v=1..H, t_src={t_src}, t_tgt={t_src}, t_cam={t_src})")
    hits = []
    for yi in range(res):
        for xi in range(res):
            q = S.query((xi + 0.5) / res, (yi + 0.5) / res, t_src, t_src, t_src)
            if q:
                hits.append(q["P"])
    P = np.array(hits)
    print(f"{len(hits)} / {res*res} rays hit geometry "
          f"({len(hits)/(res*res)*100:.0f}% coverage at {res}x{res})")
    print(f"bounds   x [{P[:,0].min():.2f}, {P[:,0].max():.2f}]"
          f"   y [{P[:,1].min():.2f}, {P[:,1].max():.2f}]"
          f"   z [{P[:,2].min():.2f}, {P[:,2].max():.2f}]")


def depth_map(t_src=0, n=7) -> None:
    hr(f"depth map  q = (u, v, {t_src}, {t_src}, {t_src}) -> P.z")
    print("centre row, z in metres (warm = far):")
    for v in np.linspace(0.2, 0.8, n):
        row = []
        for u in np.linspace(0.1, 0.9, 9):
            q = S.query(float(u), float(v), t_src, t_src, t_src)
            row.append("   sky" if q is None else f"{q['P'][2]:6.2f}")
        print(f"  v={v:.2f} " + " ".join(row))


def cameras(t_src=0, t_tgt=4, h=7, w=9) -> None:
    hr(f"camera recovery  i={t_src} <- j={t_tgt}  ({h}x{w} ensemble)")
    A, B = [], []
    for y in range(h):
        for x in range(w):
            u, v = (x + 0.5) / w, (y + 0.5) / h
            a = S.query(u, v, t_src, t_src, t_src)
            b = S.query(u, v, t_src, t_src, t_tgt)
            if a and b:
                A.append(a["P"])
                B.append(b["P"])
    A, B = np.array(A), np.array(B)
    R_est, t_est, _ = G.umeyama(B, A)
    _, Ri = S.camera_at(t_src)
    _, Rj = S.camera_at(t_tgt)
    R_gt = Ri @ Rj.T
    ang = np.degrees(np.arccos(np.clip((np.trace(R_est.T @ R_gt) - 1) / 2, -1, 1)))

    focals = []
    for u in np.linspace(0.2, 0.8, 9):
        q = S.query(float(u), 0.5, t_src, t_src, t_src)
        if q is None:
            continue
        f = G.focal_from_point(float(u), q["P"])
        if np.isfinite(f):
            focals.append(f)
    f_med = float(np.median(focals))

    print(f"correspondences   {len(A)}")
    print(f"rotation error    {ang:.3e} deg")
    print(f"focal f/W         {f_med:.6f}   (ground truth {S.INTR['fx']/S.W:.6f})")


def task_table() -> None:
    hr("the same interface, five tasks (D4RT Table 1)")
    rows = [
        ("point track", "fixed", "fixed", "fixed", "1..T", "= t_src"),
        ("point cloud", "1..W", "1..H", "1..T", "= t_src", "fixed"),
        ("depth map", "1..W", "1..H", "1..T", "= t_src", "= t_src"),
        ("extrinsics", "1..h", "1..w", "fixed", "1..T", "1..T"),
        ("intrinsics", "1..h", "1..w", "1..T", "—", "—"),
    ]
    print(f"{'task':<13}{'u':<7}{'v':<7}{'t_src':<8}{'t_tgt':<9}{'t_cam'}")
    for r in rows:
        print(f"{r[0]:<13}{r[1]:<7}{r[2]:<7}{r[3]:<8}{r[4]:<9}{r[5]}")
    print("\nonly the query pattern changes -- the model, decoder and loss stay the same.")


def main() -> int:
    ap = argparse.ArgumentParser(description="tour of the D4RT query interface")
    ap.add_argument("--track", action="store_true")
    ap.add_argument("--cloud", action="store_true")
    ap.add_argument("--depth", action="store_true")
    ap.add_argument("--cameras", action="store_true")
    args = ap.parse_args()

    print("D4RT paper lab -- reference implementation")
    print(f"scene: {S.T} frames, {S.W}x{S.H}, f={S.INTR['fx']:.1f}px, "
          f"{len(S.build_material_points())} material points")

    only = args.track or args.cloud or args.depth or args.cameras
    if args.track or not only:
        point_track()
    if args.cloud or not only:
        point_cloud()
    if args.depth or not only:
        depth_map()
    if args.cameras or not only:
        cameras()
    if not only:
        task_table()
    return 0


if __name__ == "__main__":
    sys.exit(main())
