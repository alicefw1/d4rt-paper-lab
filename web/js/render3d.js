/* =========================================================================
 * render3d.js -- a dependency-free 3D point/line renderer on Canvas 2D.
 *
 * Painter's algorithm, perspective projection, orbit controls.  Deliberately
 * small: the lab needs point clouds, frusta, rays and labels, nothing else,
 * and it must work offline from file://.
 * ========================================================================= */
window.Viewer3D = function Viewer3D(canvas, opts) {
  'use strict';
  var self = this;
  opts = opts || {};
  var ctx = canvas.getContext('2d');
  var dpr = 1, W = 1, H = 1, pending = false;

  this.yaw = opts.yaw != null ? opts.yaw : -0.82;
  this.pitch = opts.pitch != null ? opts.pitch : 0.44;
  this.dist = opts.dist != null ? opts.dist : 11.6;
  this.target = opts.target || [0, 0.05, 0];
  this.fov = (opts.fov || 34) * Math.PI / 180;
  this.drawFn = null;
  this.showGrid = true;
  this.groundY = -0.8;
  this.dragging = false;
  this.last = null;

  function basis() {
    var cp = Math.cos(self.pitch), sp = Math.sin(self.pitch);
    var eye = [
      self.target[0] + self.dist * cp * Math.sin(self.yaw),
      self.target[1] + self.dist * sp,
      self.target[2] + self.dist * cp * Math.cos(self.yaw)
    ];
    var fwd = [self.target[0] - eye[0], self.target[1] - eye[1], self.target[2] - eye[2]];
    var fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
    fwd = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
    var right = [-fwd[2], 0, fwd[0]];
    var rl = Math.hypot(right[0], right[2]) || 1;
    right = [right[0] / rl, 0, right[2] / rl];
    var up = [
      right[1] * fwd[2] - right[2] * fwd[1],
      right[2] * fwd[0] - right[0] * fwd[2],
      right[0] * fwd[1] - right[1] * fwd[0]
    ];
    return { eye: eye, fwd: fwd, right: right, up: up };
  }

  function projector(b) {
    var f = 0.5 * H / Math.tan(self.fov / 2);
    return function (p) {
      var dx = p[0] - b.eye[0], dy = p[1] - b.eye[1], dz = p[2] - b.eye[2];
      var z = dx * b.fwd[0] + dy * b.fwd[1] + dz * b.fwd[2];
      if (z < 0.12) return null;
      var x = dx * b.right[0] + dy * b.right[1] + dz * b.right[2];
      var y = dx * b.up[0] + dy * b.up[1] + dz * b.up[2];
      return { x: W / 2 + f * x / z, y: H / 2 - f * y / z, z: z, s: f / z };
    };
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    self.invalidate();
  }

  function drawGround(b, pr, items) {
    if (!self.showGrid) return;
    var y = self.groundY, lo = -5.2, hi = 5.2, step = 0.86;
    for (var g = lo; g <= hi + 1e-6; g += step) {
      for (var k = 0; k < 2; k++) {
        var a = k === 0 ? [lo, y, g] : [g, y, lo];
        var c = k === 0 ? [hi, y, g] : [g, y, hi];
        var pa = pr(a), pc = pr(c);
        if (!pa || !pc) continue;
        var radial = Math.hypot((a[0] + c[0]) / 2, (a[2] + c[2]) / 2);
        var al = Math.max(0, 0.20 - radial * 0.026);
        if (al <= 0.004) continue;
        items.push({ z: (pa.z + pc.z) / 2 + 0.001, kind: 'line', a: pa, b: pc,
          color: 'rgba(120,160,210,' + al.toFixed(3) + ')', width: 1 });
      }
    }
  }

  function render() {
    pending = false;
    var b = basis(), pr = projector(b);
    ctx.clearRect(0, 0, W, H);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(12,18,30,1)');
    bg.addColorStop(0.55, 'rgba(9,13,23,1)');
    bg.addColorStop(1, 'rgba(7,10,18,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var vg = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.1, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(40,70,120,0.16)');
    vg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    var desc = (self.drawFn && self.drawFn()) || {};
    var items = [];
    if (desc.ground !== false) drawGround(b, pr, items);

    (desc.polylines || []).forEach(function (pl) {
      var pts = [], zsum = 0, cnt = 0;
      pl.pts.forEach(function (p) {
        var q = pr(p);
        if (q) { pts.push(q); zsum += q.z; cnt++; }
      });
      if (pts.length > 1) {
        items.push({ z: (zsum / cnt) + 0.02, kind: 'poly', pts: pts, color: pl.color,
          width: pl.width || 2, alpha: pl.alpha == null ? 1 : pl.alpha, dash: pl.dash, glow: pl.glow });
      }
    });
    (desc.lines || []).forEach(function (l) {
      var pa = pr(l.a), pb = pr(l.b);
      if (!pa || !pb) return;
      items.push({ z: (pa.z + pb.z) / 2 + 0.02, kind: 'line', a: pa, b: pb, color: l.color,
        width: l.width || 1.5, alpha: l.alpha == null ? 1 : l.alpha, dash: l.dash });
    });
    (desc.points || []).forEach(function (p) {
      var q = pr(p.p);
      if (!q) return;
      items.push({ z: q.z, kind: 'point', x: q.x, y: q.y, color: p.color,
        size: Math.max(0.7, Math.min(6, (p.size || 2) * Math.min(1.4, q.s / 70))),
        alpha: p.alpha == null ? 1 : p.alpha });
    });
    (desc.labels || []).forEach(function (lb) {
      var q = pr(lb.p);
      if (!q) return;
      items.push({ z: q.z - 0.001, kind: 'label', x: q.x, y: q.y, text: lb.text,
        color: lb.color || '#e8f1ff', bg: lb.bg || 'rgba(8,12,22,0.86)', dx: lb.dx || 0, dy: lb.dy || 0 });
    });

    items.sort(function (a, c) { return c.z - a.z; });

    ctx.lineCap = 'round';
    for (var i = 0; i < items.length; i++) {
      var it = items[i], al = it.alpha == null ? 1 : it.alpha;
      if (it.kind === 'point') {
        var fade = Math.max(0.32, Math.min(1, 1.45 - it.z / 26));
        ctx.globalAlpha = al * fade;
        ctx.fillStyle = it.color;
        var s = it.size;
        ctx.fillRect(it.x - s / 2, it.y - s / 2, s, s);
      } else if (it.kind === 'line') {
        ctx.globalAlpha = al;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = it.width;
        if (it.dash) ctx.setLineDash(it.dash); else ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(it.a.x, it.a.y);
        ctx.lineTo(it.b.x, it.b.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (it.kind === 'poly') {
        ctx.globalAlpha = al;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = it.width;
        if (it.dash) ctx.setLineDash(it.dash); else ctx.setLineDash([]);
        if (it.glow) { ctx.shadowColor = it.color; ctx.shadowBlur = 12; }
        ctx.beginPath();
        ctx.moveTo(it.pts[0].x, it.pts[0].y);
        for (var j = 1; j < it.pts.length; j++) ctx.lineTo(it.pts[j].x, it.pts[j].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
      } else if (it.kind === 'label') {
        ctx.globalAlpha = 1;
        ctx.font = '600 11px ui-monospace, "Cascadia Code", Consolas, monospace';
        var w = ctx.measureText(it.text).width + 12;
        var x = Math.max(4, Math.min(W - w - 4, it.x + it.dx));
        var y = Math.max(14, Math.min(H - 6, it.y + it.dy));
        ctx.fillStyle = it.bg;
        roundRect(x, y - 12, w, 17, 4);
        ctx.fill();
        ctx.fillStyle = it.color;
        ctx.fillText(it.text, x + 6, y);
      }
    }
    ctx.globalAlpha = 1;

    if (desc.hud !== false) axisGizmo(b);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function axisGizmo(b) {
    var ox = 34, oy = H - 30, len = 22;
    var axes = [
      { d: [1, 0, 0], c: '#ff7a6b', l: 'x' },
      { d: [0, 1, 0], c: '#7ef0a8', l: 'y' },
      { d: [0, 0, 1], c: '#7fb4ff', l: 'z' }
    ];
    ctx.font = '10px ui-monospace, Consolas, monospace';
    axes.forEach(function (a) {
      var x = a.d[0] * b.right[0] + a.d[1] * b.right[1] + a.d[2] * b.right[2];
      var y = a.d[0] * b.up[0] + a.d[1] * b.up[1] + a.d[2] * b.up[2];
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = a.c;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + x * len, oy - y * len);
      ctx.stroke();
      ctx.fillStyle = a.c;
      ctx.fillText(a.l, ox + x * (len + 6) - 3, oy - y * (len + 6) + 3);
    });
    ctx.globalAlpha = 1;
  }

  this.invalidate = function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(render);
  };
  this.setDrawFn = function (fn) { self.drawFn = fn; self.invalidate(); };
  this.reset = function () {
    self.yaw = opts.yaw != null ? opts.yaw : -0.82;
    self.pitch = opts.pitch != null ? opts.pitch : 0.44;
    self.dist = opts.dist != null ? opts.dist : 11.6;
    self.target = (opts.target || [0, 0.05, 0]).slice();
    self.invalidate();
  };

  canvas.addEventListener('pointerdown', function (e) {
    self.dragging = true;
    self.last = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!self.dragging || !self.last) return;
    var dx = e.clientX - self.last[0], dy = e.clientY - self.last[1];
    self.yaw -= dx * 0.0075;
    self.pitch = Math.max(-0.12, Math.min(1.32, self.pitch + dy * 0.006));
    self.last = [e.clientX, e.clientY];
    self.invalidate();
  });
  function endDrag() { self.dragging = false; self.last = null; canvas.style.cursor = 'grab'; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    self.dist = Math.max(4.2, Math.min(26, self.dist * (1 + Math.sign(e.deltaY) * 0.09)));
    self.invalidate();
  }, { passive: false });
  canvas.addEventListener('dblclick', self.reset);
  canvas.style.cursor = 'grab';

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  resize();
};
