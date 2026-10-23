"""Geometry core for the D4RT paper lab -- Python *reference* implementation.

Every formula here is mirrored 1:1 in ``web/js/scene.js`` (the browser copy used
by the interactive lab).  ``lab/export.py`` writes a set of golden query
answers that the web app re-computes at start-up, so the two implementations
can never silently drift apart.

Conventions (identical on both sides)
-------------------------------------
world   right-handed, +y up, metric units
camera  pinhole, +z forward, +x right, +y down (OpenCV-like image axes)
        R rows are (right, down, forward) expressed in world coordinates
        X_cam = R @ (X_world - eye)
        u_pix = fx * x/z + cx ,  v_pix = fy * y/z + cy
        u_n   = u_pix / W      (normalised coords, as used in the D4RT paper)

Primitives ("material point" model)
-----------------------------------
A primitive carries a *material* frame.  A 3D point is stored in that frame
(``local``) and mapped to the world by ``p = c + R_prim @ local``.  Static
primitives simply have a constant transform, dynamic ones move; this is what
makes a point track well defined across time.
"""

from __future__ import annotations

import numpy as np

Array = np.ndarray


# --------------------------------------------------------------------------- #
# small helpers
# --------------------------------------------------------------------------- #
def normalize(v: Array) -> Array:
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def look_at(eye: Array, target: Array, up: Array | None = None) -> Array:
    """World -> camera rotation whose rows are (right, down, forward)."""
    up = np.array([0.0, 1.0, 0.0]) if up is None else np.asarray(up, float)
    eye, target = np.asarray(eye, float), np.asarray(target, float)
    fwd = normalize(target - eye)
    right = normalize(np.cross(fwd, up))
    down = np.cross(fwd, right)
    return np.stack([right, down, fwd], axis=0)


def project(R: Array, eye: Array, intr: dict, X: Array) -> tuple[float, float, float] | None:
    """World point -> (u_n, v_n, depth).  None when behind the camera."""
    Xc = R @ (np.asarray(X, float) - eye)
    z = float(Xc[2])
    if z <= 1e-6:
        return None
    u = (intr["fx"] * Xc[0] / z + intr["cx"]) / intr["W"]
    v = (intr["fy"] * Xc[1] / z + intr["cy"]) / intr["H"]
    return float(u), float(v), z


def unproject(R: Array, eye: Array, intr: dict, u_n: float, v_n: float) -> tuple[Array, Array]:
    """Pixel -> world ray (origin, unit direction).  Inverse of :func:`project`."""
    px, py = u_n * intr["W"], v_n * intr["H"]
    x = (px - intr["cx"]) / intr["fx"]
    y = (py - intr["cy"]) / intr["fy"]
    d = normalize(R[2] + x * R[0] + y * R[1])
    return np.asarray(eye, float).copy(), d


def rodrigues(axis: Array, angle: float) -> Array:
    """Rotation matrix about a (normalised) axis."""
    k = normalize(np.asarray(axis, float))
    K = np.array([[0.0, -k[2], k[1]], [k[2], 0.0, -k[0]], [-k[1], k[0], 0.0]])
    return np.eye(3) + np.sin(angle) * K + (1.0 - np.cos(angle)) * (K @ K)


# --------------------------------------------------------------------------- #
# ray / primitive intersection
# --------------------------------------------------------------------------- #
def _intersect_plane(prim: dict, o: Array, d: Array):
    n = np.asarray(prim["n"], float)
    den = float(d @ n)
    if abs(den) < 1e-9:
        return None
    t = float((np.asarray(prim["p0"], float) - o) @ n) / den
    if t <= 1e-6:
        return None
    p = o + t * d
    if "half" in prim:                      # bounded floor: avoids 100 m grazing hits
        h = np.asarray(prim["half"], float)
        if abs(p[0] - prim["p0"][0]) > h[0] or abs(p[2] - prim["p0"][2]) > h[1]:
            return None
    return t, p


def _intersect_sphere(prim: dict, o: Array, d: Array):
    R = np.asarray(prim["R"], float)
    c = np.asarray(prim["c"], float)
    ol = R.T @ (o - c)
    dl = R.T @ d
    r = float(prim["r"])
    a = float(dl @ dl)
    b = 2.0 * float(ol @ dl)
    cc = float(ol @ ol) - r * r
    disc = b * b - 4 * a * cc
    if disc < 0.0:
        return None
    sq = np.sqrt(disc)
    best = None
    for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)):
        if t > 1e-6 and (best is None or t < best):
            best = t
    if best is None:
        return None
    return float(best), ol + best * dl


def _intersect_box(prim: dict, o: Array, d: Array):
    c = np.asarray(prim["c"], float)
    half = np.asarray(prim["half"], float)
    oo, dd = o - c, d
    tmin, tmax = -np.inf, np.inf
    for k in range(3):
        if abs(dd[k]) < 1e-12:
            if abs(oo[k]) > half[k]:
                return None
            continue
        t1 = (-half[k] - oo[k]) / dd[k]
        t2 = (half[k] - oo[k]) / dd[k]
        tmin, tmax = max(tmin, min(t1, t2)), min(tmax, max(t1, t2))
        if tmin > tmax:
            return None
    if tmax <= 1e-6:
        return None
    t = tmin if tmin > 1e-6 else tmax
    return float(t), oo + t * dd


_INTERSECTORS = {
    "plane": _intersect_plane,
    "sphere": _intersect_sphere,
    "box": _intersect_box,
}


def intersect(prim: dict, o: Array, d: Array):
    """Nearest hit of a ray with one primitive: (t, local_point) or None."""
    fn = _INTERSECTORS.get(prim["type"])
    return None if fn is None else fn(prim, o, d)


# --------------------------------------------------------------------------- #
# material-point transform
# --------------------------------------------------------------------------- #
def local_to_world(prim: dict, local: Array) -> Array:
    R = np.asarray(prim["R"], float)
    c = np.asarray(prim["c"], float)
    return c + R @ np.asarray(local, float)


# --------------------------------------------------------------------------- #
# rigid alignment / camera recovery (D4RT sec. 2.1)
# --------------------------------------------------------------------------- #
def umeyama(src: Array, dst: Array, with_scale: bool = False):
    """Least-squares rigid transform mapping ``src`` onto ``dst`` (Horn/Umeyama).

    Returns (R, t, s) such that  dst ~= s * R @ src + t.
    """
    src = np.asarray(src, float)
    dst = np.asarray(dst, float)
    mu_s, mu_d = src.mean(0), dst.mean(0)
    X, Y = src - mu_s, dst - mu_d
    Sigma = (Y.T @ X) / len(src)
    U, D, Vt = np.linalg.svd(Sigma)
    S = np.eye(3)
    if np.linalg.det(U) * np.linalg.det(Vt) < 0:
        S[2, 2] = -1.0
    R = U @ S @ Vt
    s = float(np.trace(np.diag(D) @ S) / max((X**2).sum() / len(src), 1e-12)) if with_scale else 1.0
    t = mu_d - s * R @ mu_s
    return R, t, s


def focal_from_point(u_n: float, P: Array) -> float:
    """Normalised focal length implied by one decoded point (D4RT eq. in sec. 2.1).

    fx_n = pz * (u - 0.5) / px, with a principal point at (0.5, 0.5).
    """
    px, _, pz = float(P[0]), float(P[1]), float(P[2])
    if abs(px) < 1e-9:
        return float("nan")
    return pz * (u_n - 0.5) / px
