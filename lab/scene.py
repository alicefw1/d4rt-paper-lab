"""A small analytic 4D scene with exact ground truth -- the lab's "video".

Why a synthetic scene?  The lab teaches the *semantics* of D4RT's query
interface.  Running the real network in a browser is impossible, but the
interface itself is pure geometry: if we build a scene where every surface point
has a known material identity and a known motion, then

    query(u, v, t_src, t_tgt, t_cam) -> P in R^3

has an exact answer.  Learners can therefore drive the exact same interface the
paper defines, and see ground truth instead of a network prediction.  The UI
says so explicitly.

Scene content
-------------
* ground plane + grid (static)
* three blocks (static)
* one large "planet" sphere orbiting and spinning (dynamic -> point tracks curve)
* two small moons orbiting the planet (dynamic, faster)

The video has ``T`` frames; frame ``k`` is timestamp ``k``.  Cameras fly along a
60-degree arc, so multi-view geometry and camera recovery are both meaningful.
"""

from __future__ import annotations

import numpy as np

import geometry as G

# --------------------------------------------------------------------------- #
# global settings
# --------------------------------------------------------------------------- #
T = 8            # frames in the clip
W, H = 192, 144  # frame resolution used by the lab
FOV_Y = 46.0     # vertical field of view, degrees

PLANET_RADIUS = 0.60
ORBIT_RADIUS = 1.65
GROUND_Y = -0.80

PRIM_NAMES = ["ground", "block-a", "block-b", "tower", "planet", "moon-1", "moon-2"]


def _intrinsics(w: int = W, h: int = H) -> dict:
    fx = 0.5 * w / np.tan(np.deg2rad(FOV_Y) / 2.0)
    return {"fx": float(fx), "fy": float(fx), "cx": w / 2.0, "cy": h / 2.0, "W": w, "H": h}


INTR = _intrinsics()


# --------------------------------------------------------------------------- #
# camera path
# --------------------------------------------------------------------------- #
def camera_at(t: float) -> tuple[np.ndarray, np.ndarray]:
    """Camera at (integer) time t: returns (eye, R_world_to_cam)."""
    th = -0.55 + 0.148 * t
    eye = np.array([8.45 * np.cos(th), 3.02 + 0.16 * np.sin(0.6 * t), 8.45 * np.sin(th)])
    target = np.array([0.0, 0.26, 0.0])
    return eye, G.look_at(eye, target)


# --------------------------------------------------------------------------- #
# dynamic primitives
# --------------------------------------------------------------------------- #
def planet_center(t: float) -> np.ndarray:
    th = 0.78 * t + 0.35
    return np.array([ORBIT_RADIUS * np.cos(th), 0.28 + 0.22 * np.sin(1.55 * t), ORBIT_RADIUS * np.sin(th)])


def planet_rotation(t: float) -> np.ndarray:
    return G.rodrigues(np.array([0.32, 1.0, 0.21]), 1.05 * t)


def moon_center(t: float, phase: float) -> np.ndarray:
    th = 2.15 * t + phase
    return planet_center(t) + np.array(
        [0.98 * np.cos(th), 0.34 * np.sin(th * 1.7), 0.98 * np.sin(th)]
    )


def build_frame(t: float) -> list[dict]:
    """Primitive list of the scene at time t (index order == PRIM_NAMES)."""
    ground = {"type": "plane", "n": [0.0, 1.0, 0.0], "p0": [0.0, GROUND_Y, 0.0],
              "half": [5.6, 5.6],          # bounded floor -> finite depths
              "R": np.eye(3), "c": np.zeros(3)}
    blocks = [
        {"type": "box", "c": [-2.15, -0.30, 1.15], "half": [0.46, 0.50, 0.46]},
        {"type": "box", "c": [2.05, -0.44, -1.05], "half": [0.62, 0.36, 0.62]},
        {"type": "box", "c": [0.18, -0.12, -2.55], "half": [0.34, 0.68, 0.34]},
    ]
    for b in blocks:
        b["R"] = np.eye(3)

    planet = {"type": "sphere", "c": planet_center(t), "R": planet_rotation(t), "r": PLANET_RADIUS}
    moons = [
        {"type": "sphere", "c": moon_center(t, 0.0), "R": G.rodrigues([0.0, 1.0, 0.0], 2.6 * t), "r": 0.20},
        {"type": "sphere", "c": moon_center(t, np.pi), "R": G.rodrigues([1.0, 0.2, 0.0], -1.8 * t), "r": 0.16},
    ]
    return [ground, *blocks, planet, *moons]


# --------------------------------------------------------------------------- #
# material points (the stuff that gets rendered and tracked)
# --------------------------------------------------------------------------- #
def _fibonacci_sphere(n: int, rng: np.random.Generator) -> np.ndarray:
    i = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    theta = np.pi * (1 + 5**0.5) * i
    return np.stack([np.cos(theta) * np.sin(phi), np.cos(phi), np.sin(theta) * np.sin(phi)], 1)


def _box_surface_points(prim: dict, n: int, rng: np.random.Generator) -> np.ndarray:
    half = np.asarray(prim["half"], float)
    pts = []
    for _ in range(n):
        axis = rng.integers(0, 3)
        sign = rng.choice([-1.0, 1.0])
        p = rng.uniform(-1.0, 1.0, 3) * half
        p[axis] = sign * half[axis]
        pts.append(p)
    return np.array(pts)


def build_material_points(seed: int = 7) -> list[dict]:
    """Returns [{prim, local:[3], color}] -- resolution-independent surface samples."""
    rng = np.random.default_rng(seed)
    pts: list[dict] = []

    # ground: checkerboard tinted samples, denser near the middle
    for _ in range(1150):
        x, z = rng.uniform(-4.2, 4.2), rng.uniform(-4.2, 4.2)
        cell = int(np.floor(x / 0.9) + np.floor(z / 0.9)) % 2
        pts.append({"prim": 0, "local": [x, GROUND_Y, z],
                    "color": "#33465f" if cell else "#28374b"})

    # blocks, colored per face normal so the geometry reads clearly
    block_colors = [["#2fb8a6", "#2596a0", "#37c9b4"], ["#c98a2e", "#d9a441", "#b57524"],
                    ["#8b6bd6", "#9d7ff0", "#7757c4"]]
    frame0 = build_frame(0.0)
    for pi in (1, 2, 3):
        local = _box_surface_points(frame0[pi], 165, rng)
        # color by dominant face normal
        for p in local:
            h = np.asarray(frame0[pi]["half"], float)
            axis = int(np.argmax(np.abs(p) / h))
            shade = 1.0 if p[axis] > 0 else 0.72
            base = np.array([int(block_colors[pi - 1][axis][1:3], 16),
                             int(block_colors[pi - 1][axis][3:5], 16),
                             int(block_colors[pi - 1][axis][5:7], 16)], float)
            rgb = np.clip(base * shade, 0, 255)
            pts.append({"prim": pi, "local": p.tolist(),
                        "color": "#%02x%02x%02x" % tuple(int(v) for v in rgb)})

    # planet: latitude/longitude colouring makes its spin visible in tracks
    for p in _fibonacci_sphere(520, rng):
        lat = p[1]
        lon = np.arctan2(p[2], p[0])
        band = 0.5 + 0.5 * np.sin(3.0 * lon)
        c1, c2 = np.array([0.95, 0.42, 0.30]), np.array([0.98, 0.72, 0.36])
        rgb = c1 * (1 - band) + c2 * band
        rgb *= 0.62 + 0.38 * (lat * 0.5 + 0.5)
        pts.append({"prim": 4, "local": p.tolist(), "color": "#%02x%02x%02x" % tuple(int(v * 255) for v in rgb)})

    for pi, n, col in ((5, 150, "#7fe3ff"), (6, 110, "#a6b8ff")):
        for p in _fibonacci_sphere(n, rng):
            pts.append({"prim": pi, "local": p.tolist(), "color": col})

    return pts


# --------------------------------------------------------------------------- #
# the query interface
# --------------------------------------------------------------------------- #
def query(u_n: float, v_n: float, t_src: int, t_tgt: int, t_cam: int,
          frames: list[dict] | None = None, cams: list | None = None):
    """D4RT's decoding interface, answered exactly.

    ``frames`` / ``cams`` may be supplied to evaluate the *exported* (rounded)
    scene instead of the analytic one -- that is what makes the browser
    self-check compare like with like.

    Returns dict(P, prim, world, depth_src, local) or None when the source pixel
    looks at the sky.
    """
    frames = frames or [build_frame(t) for t in range(T)]
    cams = cams or [camera_at(t) for t in range(T)]
    eye_s, R_s = cams[t_src]
    o, d = G.unproject(R_s, eye_s, INTR, u_n, v_n)

    best = None
    for idx, prim in enumerate(frames[t_src]):
        hit = G.intersect(prim, o, d)
        if hit is None:
            continue
        t_hit, local = hit
        if best is None or t_hit < best[0]:
            best = (t_hit, idx, local)
    if best is None:
        return None

    t_hit, idx, local = best
    world = G.local_to_world(frames[t_tgt][idx], local)
    eye_c, R_c = cams[t_cam]
    P = R_c @ (world - eye_c)
    return {"P": P, "prim": idx, "world": world, "depth_src": float(t_hit), "local": local}


def project_world(X: np.ndarray, t: int, cams: list | None = None) -> tuple[float, float, float] | None:
    cams = cams or [camera_at(k) for k in range(T)]
    eye, R = cams[t]
    return G.project(R, eye, INTR, X)


def bulk_points(t: int) -> tuple[np.ndarray, np.ndarray]:
    """Material sample points in the world at time t: (xyz[N,3], prim_ids[N])."""
    prims = build_frame(t)
    mats = build_material_points()
    xyz = np.array([G.local_to_world(prims[m["prim"]], m["local"]) for m in mats])
    ids = np.array([m["prim"] for m in mats])
    return xyz, ids


if __name__ == "__main__":  # tiny smoke test
    for t in range(T):
        eye, R = camera_at(t)
        print(f"t={t} eye={np.round(eye, 2)} fx={INTR['fx']:.1f}")
    q = query(0.5, 0.62, 0, 3, 0)
    print("query", None if q is None else np.round(q["P"], 3), PRIM_NAMES[q["prim"]] if q else "")

