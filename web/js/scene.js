/* =========================================================================
 * scene.js -- browser implementation of the D4RT query interface.
 *
 * This is a 1:1 port of lab/geometry.py + lab/scene.py.  All heavy geometry
 * (camera path, object motion) is baked by lab/export.py into SCENE_DATA;
 * what lives here is the *interface*:  q = (u, v, t_src, t_tgt, t_cam) -> P.
 *
 * Conventions: world +y up; camera +z forward, +x right, +y down;
 *              X_cam = R (X_world - eye);  u_n = u_pix / W.
 * ========================================================================= */
window.SceneLab = (function () {
  'use strict';

  var D = window.SCENE_DATA;
  var M = D.meta;
  var T = M.T;

  /* ---------------------------------------------------------------- vec/mat */
  function matVec(m, v) {           // m: flat 9 (row major)
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  }
  function matTVec(m, v) {          // m^T v
    return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
            m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
            m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
  }
  function matMul(a, b) {
    var out = new Array(9);
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      out[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
    return out;
  }
  function matT(a) { return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]]; }
  function det3(m) {
    return m[0] * (m[4] * m[8] - m[5] * m[7])
         - m[1] * (m[3] * m[8] - m[5] * m[6])
         + m[2] * (m[3] * m[7] - m[4] * m[6]);
  }
  function norm(v) { return Math.hypot(v[0], v[1], v[2]); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function unit(a) { var n = norm(a); return n < 1e-12 ? a : scale(a, 1 / n); }

  /* ------------------------------------------------------------- camera ops */
  function cam(t) {
    var f = D.frames[Math.max(0, Math.min(T - 1, Math.round(t)))];
    return { eye: f.eye, R: f.R, prims: f.prims };
  }
  function project(c, X) {                 // world -> {u,v,z} (normalised) or null
    var d = sub(X, c.eye);
    var x = c.R[0] * d[0] + c.R[1] * d[1] + c.R[2] * d[2];
    var y = c.R[3] * d[0] + c.R[4] * d[1] + c.R[5] * d[2];
    var z = c.R[6] * d[0] + c.R[7] * d[1] + c.R[8] * d[2];
    if (z <= 1e-6) return null;
    return { u: (M.fx * x / z + M.cx) / M.W, v: (M.fy * y / z + M.cy) / M.H, z: z };
  }
  function unproject(c, u, v) {            // pixel -> {o, d}
    var x = (u * M.W - M.cx) / M.fx;
    var y = (v * M.H - M.cy) / M.fy;
    var d = [
      c.R[6] + x * c.R[0] + y * c.R[3],
      c.R[7] + x * c.R[1] + y * c.R[4],
      c.R[8] + x * c.R[2] + y * c.R[5]
    ];
    return { o: c.eye, d: unit(d) };
  }

  /* -------------------------------------------------------------- intersect */
  function hitPlane(p, o, d) {
    var n = p.n, den = dot(d, n);
    if (Math.abs(den) < 1e-9) return null;
    var t = dot(sub(p.p0, o), n) / den;
    if (t <= 1e-6) return null;
    var hit = add(o, scale(d, t));
    if (p.half) {                       // bounded floor: avoids 100 m grazing hits
      if (Math.abs(hit[0] - p.p0[0]) > p.half[0] || Math.abs(hit[2] - p.p0[2]) > p.half[1]) return null;
    }
    return { t: t, local: hit };
  }
  function hitSphere(p, o, d) {
    var ol = matTVec(p.R, sub(o, p.c)), dl = matTVec(p.R, d);
    var a = dot(dl, dl), b = 2 * dot(ol, dl), cc = dot(ol, ol) - p.r * p.r;
    var disc = b * b - 4 * a * cc;
    if (disc < 0) return null;
    var sq = Math.sqrt(disc), t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a);
    var t = t1 > 1e-6 ? t1 : (t2 > 1e-6 ? t2 : null);
    if (t === null) return null;
    return { t: t, local: add(ol, scale(dl, t)) };
  }
  function hitBox(p, o, d) {
    var oo = sub(o, p.c), h = p.half, tmin = -Infinity, tmax = Infinity;
    for (var k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-12) {
        if (Math.abs(oo[k]) > h[k]) return null;
        continue;
      }
      var t1 = (-h[k] - oo[k]) / d[k], t2 = (h[k] - oo[k]) / d[k];
      if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
    if (tmax <= 1e-6) return null;
    var t = tmin > 1e-6 ? tmin : tmax;
    return { t: t, local: add(oo, scale(d, t)) };
  }
  function intersect(p, o, d) {
    if (p.type === 'plane') return hitPlane(p, o, d);
    if (p.type === 'sphere') return hitSphere(p, o, d);
    if (p.type === 'box') return hitBox(p, o, d);
    return null;
  }
  function toWorld(prim, local) { return add(prim.c, matVec(prim.R, local)); }

  /* ------------------------------------------------------- THE interface   */
  /** q = (u, v, t_src, t_tgt, t_cam) -> {P, world, prim, local, depth} */
  function query(u, v, tSrc, tTgt, tCam) {
    var cs = cam(tSrc), ct = cam(tTgt), cc = cam(tCam);
    var ray = unproject(cs, u, v);
    var best = null;
    for (var i = 0; i < cs.prims.length; i++) {
      var h = intersect(cs.prims[i], ray.o, ray.d);
      if (h && (!best || h.t < best.t)) best = { t: h.t, idx: i, local: h.local };
    }
    if (!best) return null;
    var world = toWorld(ct.prims[best.idx], best.local);
    var P = matVec(cc.R, sub(world, cc.eye));
    return { P: P, world: world, prim: best.idx, local: best.local, depth: best.t, ray: ray, src: cs };
  }

  /* --------------------------------------------- camera recovery (sec 2.1) */
  /** Symmetric Jacobi eigen-decomposition; eigenvector i is column i of `vectors`. */
  function jacobiEigen(Ain, n) {
    var A = Ain.map(function (r) { return r.slice(); });
    var V = [];
    for (var i = 0; i < n; i++) { V.push(new Array(n).fill(0)); V[i][i] = 1; }
    for (var sweep = 0; sweep < 80; sweep++) {
      var off = 0;
      for (var p = 0; p < n; p++) for (var q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-24) break;
      for (p = 0; p < n; p++) for (q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-18) continue;
        var theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        var tt = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        var c = 1 / Math.sqrt(tt * tt + 1), s = tt * c;
        for (var k = 0; k < n; k++) {
          var akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (k = 0; k < n; k++) {
          var apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (k = 0; k < n; k++) {
          var vkp = V[k][p], vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
    return { values: A.map(function (r, i) { return r[i]; }), vectors: V };
  }

  function quatToMat(q0, qx, qy, qz) {
    return [
      q0 * q0 + qx * qx - qy * qy - qz * qz, 2 * (qx * qy - q0 * qz), 2 * (qx * qz + q0 * qy),
      2 * (qx * qy + q0 * qz), q0 * q0 - qx * qx + qy * qy - qz * qz, 2 * (qy * qz - q0 * qx),
      2 * (qx * qz - q0 * qy), 2 * (qy * qz + q0 * qx), q0 * q0 - qx * qx - qy * qy + qz * qz
    ];
  }

  /** Rigid transform (R,t) with dst ~= R @ src + t  (Horn quaternion method). */
  function umeyama(src, dst) {
    var n = src.length, ms = [0, 0, 0], md = [0, 0, 0], i;
    for (i = 0; i < n; i++) { for (var k = 0; k < 3; k++) { ms[k] += src[i][k]; md[k] += dst[i][k]; } }
    for (k = 0; k < 3; k++) { ms[k] /= n; md[k] /= n; }
    var S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (i = 0; i < n; i++) {
      var x = sub(src[i], ms), y = sub(dst[i], md);
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) S[a][b] += x[a] * y[b];
    }
    var Sxx = S[0][0], Sxy = S[0][1], Sxz = S[0][2];
    var Syx = S[1][0], Syy = S[1][1], Syz = S[1][2];
    var Szx = S[2][0], Szy = S[2][1], Szz = S[2][2];
    var N = [
      [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
      [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
      [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
      [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz]
    ];
    var eig = jacobiEigen(N, 4), best = 0;
    for (i = 1; i < 4; i++) if (eig.values[i] > eig.values[best]) best = i;
    var q = [eig.vectors[0][best], eig.vectors[1][best], eig.vectors[2][best], eig.vectors[3][best]];
    var qn = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    q = q.map(function (v) { return v / qn; });
    var R = quatToMat(q[0], q[1], q[2], q[3]);
    return { R: R, t: sub(md, matVec(R, ms)) };
  }

  /** Normalised focal length implied by one decoded point (paper sec. 2.1). */
  function focalFromPoint(u, P) {
    if (Math.abs(P[0]) < 1e-9) return NaN;
    return P[2] * (u - 0.5) / P[0];
  }

  /** Ensemble of queries in two reference frames -> relative pose i <- j. */
  function estimatePose(tSrc, i, j, h, w) {
    var A = [], B = [];
    for (var yi = 0; yi < h; yi++) for (var xi = 0; xi < w; xi++) {
      var u = (xi + 0.5) / w, v = (yi + 0.5) / h;
      var a = query(u, v, tSrc, i, i), b = query(u, v, tSrc, i, j);
      if (!a || !b) continue;
      A.push(a.P); B.push(b.P);
    }
    if (A.length < 3) return null;
    var est = umeyama(B, A);
    return { R: est.R, t: est.t, n: A.length, A: A, B: B };
  }

  /** Median normalised focal length from a horizontal scan of decoded points. */
  function estimateFocal(t) {
    var vals = [];
    for (var i = 0; i < 9; i++) {
      var u = 0.18 + (0.64 * i) / 8;
      var q = query(u, 0.5, t, t, t);
      if (!q) continue;
      var f = focalFromPoint(u, q.P);
      if (isFinite(f)) vals.push(f);
    }
    if (!vals.length) return { value: NaN, n: 0 };
    vals.sort(function (a, b) { return a - b; });
    var mid = vals.length >> 1;
    return { value: vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2, n: vals.length, all: vals };
  }

  function relativePoseGT(i, j) {          // world->cam_i  composed with  cam_j->world
    var Ri = cam(i).R, Rj = cam(j).R;
    var R = matMul(Ri, matT(Rj));
    var t = matVec(Ri, sub(cam(j).eye, cam(i).eye));
    return { R: R, t: t };
  }

  /* ------------------------------------------------------------- bulk scans */
  /** Dense decode: grid of pixels of frame tSrc, values in camera tCam. */
  function scan(tSrc, tTgt, tCam, res) {
    res = res || 64;
    var w = res, h = Math.round(res * 0.75), out = [];
    for (var yi = 0; yi < h; yi++) for (var xi = 0; xi < w; xi++) {
      var u = (xi + 0.5) / w, v = (yi + 0.5) / h;
      var q = query(u, v, tSrc, tTgt, tCam);
      if (!q) continue;
      out.push({ u: u, v: v, P: q.P, world: q.world, z: q.P[2], prim: q.prim });
    }
    return { w: w, h: h, samples: out };
  }

  /* -------------------------------------------------------------- self test */
  function selfTest() {
    var g = window.GOLDEN, details = [], pass = 0, total = 0;
    function ok(name, cond, info) { total++; if (cond) pass++; details.push({ name: name, ok: !!cond, info: info || '' }); }

    var worst = 0;
    (g.cases || []).forEach(function (c) {
      var q = query(c.q[0], c.q[1], c.q[2], c.q[3], c.q[4]);
      if (!q) { worst = Infinity; return; }
      var e = Math.max(Math.abs(q.P[0] - c.P[0]), Math.abs(q.P[1] - c.P[1]), Math.abs(q.P[2] - c.P[2]));
      if (q.prim !== c.prim) e = 1e9;
      worst = Math.max(worst, e);
    });
    ok('查询接口与 Python 参考实现一致', worst < 1e-6, (g.cases || []).length + ' 个查询, 最大偏差 ' + worst.toExponential(1));

    var p = g.pose, est = estimatePose(p.i, p.i, p.j, 7, 9);
    if (est) {
      var gt = relativePoseGT(p.i, p.j);
      var tr = 0;
      for (var k = 0; k < 9; k++) tr += est.R[k] * gt.R[k];
      var ang = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) * 180 / Math.PI;
      ok('外参恢复（Umeyama）', ang < 0.01, est.n + ' 组对应点, 旋转误差 ' + ang.toExponential(1) + '°');
    } else ok('外参恢复（Umeyama）', false, '对应点不足');

    var f = estimateFocal(0);
    ok('内参恢复（中位数）', Math.abs(f.value - g.intrinsics.medianFocalNorm) < 1e-6,
       'f/W = ' + f.value.toFixed(6) + '（真值 ' + (M.fx / M.W).toFixed(6) + '）');

    var X = [], n = 120;
    for (var i = 0; i < n; i++) X.push([Math.sin(i * 1.7) * 2, Math.cos(i + 0.3) * 1.5, (i % 11) * 0.3 - 1]);
    var Rg = cam(0).R.slice();                     // a genuine rotation matrix
    var tg = [0.4, -1.1, 2.6];
    var Y = X.map(function (x) { return add(matVec(Rg, x), tg); });
    var back = umeyama(Y, X);                      // must invert the map
    var Rt = matT(Rg), err = 0;
    for (var k2 = 0; k2 < 9; k2++) err = Math.max(err, Math.abs(back.R[k2] - Rt[k2]));
    ok('Umeyama 还原已知刚体变换', err < 1e-6, '最大元素误差 ' + err.toExponential(1));

    return { pass: pass, total: total, details: details };
  }

  return {
    meta: M, T: T, frames: D.frames, points: D.points, primNames: D.primNames,
    cam: cam, project: project, unproject: unproject, query: query, toWorld: toWorld,
    intersect: intersect, umeyama: umeyama, focalFromPoint: focalFromPoint,
    estimatePose: estimatePose, estimateFocal: estimateFocal, relativePoseGT: relativePoseGT,
    scan: scan, selfTest: selfTest,
    _math: { matVec: matVec, matTVec: matTVec, matMul: matMul, matT: matT, det3: det3,
             sub: sub, add: add, scale: scale, dot: dot, cross: cross, unit: unit, norm: norm }
  };
})();
