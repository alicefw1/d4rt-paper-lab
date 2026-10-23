/* =========================================================================
 * app.js -- UI wiring for the D4RT paper lab.
 * No framework, no build step, no network. Everything is driven by
 * LAB_DATA (content) + SceneLab (geometry).
 * ========================================================================= */
(function () {
  'use strict';

  var D = window.LAB_DATA;
  var S = window.SceneLab;
  var M = S.meta;
  var T = S.T;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function fmt(n, d) { return (n >= 0 ? '' : '') + Number(n).toFixed(d == null ? 3 : d); }
  function esc(s) {
    return String(s).split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;');
  }

  /* ------------------------------------------------------------- storage */
  var KEY = 'd4rt-lab-v1';
  var store = {
    cards: {}, quiz: { best: 0, attempts: 0 }, path: {},
    answers: {}, rubric: {}, seenIntro: false
  };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(function (k) { store[k] = parsed[k]; });
      store.cards = store.cards || {}; store.path = store.path || {};
      store.answers = store.answers || {}; store.rubric = store.rubric || {};
    }
  } catch (e) { /* private mode: run without persistence */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { }
  }

  /* ---------------------------------------------------------------- tabs */
  var TABS = ['overview', 'radar', 'matrix', 'anatomy', 'trainer', 'path'];
  function goTab(name, init) {
    $$('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'view-' + name); });
    if (!init) {
      if (history.replaceState) history.replaceState(null, '', '#' + name);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (name === 'matrix' && viewer) setTimeout(function () { viewer.invalidate(); }, 60);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]');
    if (t) { e.preventDefault(); goTab(t.dataset.tab); }
  });

  /* ------------------------------------------------------------ overview */
  var SELFCHECK = null;

  function renderOverview() {
    var stat = [
      { n: T, u: '帧', i: '一段 8 帧的合成视频，相机沿 60° 弧线运动' },
      { n: S.points.length.toLocaleString('en-US'), u: '个', i: '带材质坐标的表面采样点，可跨帧追踪' },
      { n: (window.GOLDEN.cases || []).length, u: '个', i: '启动时与 Python 参考实现逐点比对的查询' },
      { n: SELFCHECK ? SELFCHECK.pass + '/' + SELFCHECK.total : '—', u: '', i: '几何自检（投影 / 求交 / Umeyama / 内参）', acc: true }
    ];
    $('#stat-row').innerHTML = stat.map(function (s) {
      return '<div class="stat' + (s.acc ? ' acc' : '') + '"><b>' + s.n +
        (s.u ? '<span>' + s.u + '</span>' : '') + '</b><i>' + s.i + '</i></div>';
    }).join('');

    var brief = [
      { n: '01', t: '问题：解码粒度错了', p: '4D 重建被拆成多个专用模块，各自 dense 输出再做后处理对齐。成本随"帧数 × 分辨率"爆炸，动态部分还没有对应关系。' },
      { n: '02', t: '转向：从"全算"到"按需"', p: '不再逐帧解码整张图，而是让下游"问"模型：这个像素上的点，在第 k 时刻、用 j 号相机的坐标表示，在哪？' },
      { n: '03', t: '接口：一个五元组', p: 'q = (u, v, t_src, t_tgt, t_cam)。空间、时间、参考系三个自由度彻底解耦，这是全部设计的地基。' },
      { n: '04', t: '统一：任务 = 扫描方式', p: '固定点扫时间 → 轨迹；扫全像素 → 点云；只取 z → 深度图；两组点求 SVD → 相机。一个 decoder 覆盖全部。' }
    ];
    $('#brief-cards').innerHTML = brief.map(function (b) {
      return '<div class="brief"><div class="wm">' + b.n + '</div><div class="num">' + b.n + '</div>' +
        '<h3>' + b.t + '</h3><p>' + b.p + '</p></div>';
    }).join('');

    var how = [
      { t: '先玩查询矩阵', p: '把五个维度都拨一遍。重点感受 t_cam 变化时点"跳"到哪——那是坐标系在换。', tab: 'matrix' },
      { t: '再读架构解剖', p: '七步走完，每步都有一句"本质"和一条"常见误解"。误解比公式更值得记。', tab: 'anatomy' },
      { t: '用记忆卡固化', p: '间隔重复，20 张卡覆盖全部关键判断。答错一次就回到 box 0。', tab: 'trainer' },
      { t: '最后动手复现', p: '跑 lab/ 里的 Python 参考实现，改场景、改查询，与浏览器的结果对齐。', tab: 'path' }
    ];
    $('#howto').innerHTML = how.map(function (h) {
      return '<li><b>' + h.t + '</b>' + h.p + '</li>';
    }).join('');
    $$('#howto li').forEach(function (li, i) {
      li.style.cursor = 'pointer';
      li.addEventListener('click', function () { goTab(how[i].tab); });
    });

    var chain = [
      { yr: 'CVPR 2025 · BEST PAPER', t: 'VGGT', p: '一个前馈 Transformer 读入 1–N 张图，一次前向回归相机、深度、点图。证明了"几何可以直接回归"。', d: '留下的问题：多个专用 head，且不建模动态对应。' },
      { yr: 'CVPR 2026 · BEST PAPER', t: 'D4RT', p: '把"回归"换成"寻址"：单一解码器 + 五元组查询，任意点、任意时刻、任意参考系。', d: '关键跃迁：任务由查询模式定义，而不是由网络结构定义。' }
    ];
    $('#chain').innerHTML =
      '<div class="chain-card"><div class="yr">' + chain[0].yr + '</div><h3>' + chain[0].t + '</h3><p>' + chain[0].p +
      '</p><div class="delta">' + chain[0].d + '</div></div>' +
      '<div class="chain-arrow">→</div>' +
      '<div class="chain-card"><div class="yr">' + chain[1].yr + '</div><h3>' + chain[1].t + '</h3><p>' + chain[1].p +
      '</p><div class="delta">' + chain[1].d + '</div></div>';
  }

  /* --------------------------------------------------------------- radar */
  function renderRadar() {
    var grid = $('#paper-grid');
    function paint(filter) {
      var list = D.papers.filter(function (p) {
        if (filter === 'all') return true;
        if (filter === 'best') return p.awardKind === 'best';
        if (filter === 'CVPR' || filter === 'ICCV') return p.venue.indexOf(filter) === 0;
        if (filter === 'chain') return ['vggt', 'd4rt', 'megasam', 'rayzer'].indexOf(p.id) >= 0;
        return true;
      });
      grid.innerHTML = list.map(function (p) {
        return '<article class="pcard ' + (p.id === 'd4rt' ? 'anchor' : '') + '">' +
          '<div class="pc-head"><span class="venue">' + p.venue + '</span>' +
          '<span class="award ' + p.awardKind + '">' + p.award + '</span></div>' +
          '<h3>' + esc(p.title) + '</h3>' +
          '<div class="org">' + esc(p.org) + '</div>' +
          '<p class="one">' + esc(p.one) + '</p>' +
          '<p class="why"><b>为什么读 · </b>' + esc(p.why) + '</p>' +
          '<div class="tags">' + p.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
          '<div class="pc-foot">' + p.links.map(function (l) {
            return '<a href="' + l.u + '" target="_blank" rel="noopener">' + esc(l.l) + ' ↗</a>';
          }).join('') + '</div></article>';
      }).join('');
    }
    paint('all');
    $$('#radar-filter .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#radar-filter .chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        paint(c.dataset.filter);
      });
    });

    var c = D.compare;
    $('#compare-table').innerHTML = '<table class="cmp"><thead><tr>' +
      c.head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      c.rows.map(function (r) {
        return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
      }).join('') + '</tbody></table>';

    $('#sources').innerHTML = '<span>来源核验：</span>' + D.sources.map(function (s) {
      return '<a href="' + s.u + '" target="_blank" rel="noopener">' + esc(s.l) + '</a>';
    }).join('<span>·</span>');
  }

  /* =============================================================== MATRIX */
  var viewer = null;
  var mx = {
    mode: 'track', u: 0.5, v: 0.45, tsrc: 0, ttgt: 3, tcam: 0,
    playing: false, timer: null
  };
  var scanCache = {}, poseCache = {};

  var PRIM_COLOR = ['#33465f', '#2fb8a6', '#c98a2e', '#8b6bd6', '#ff8a4c', '#7fe3ff', '#a6b8ff'];

  function depthColor(z, lo, hi) {
    var t = hi > lo ? (z - lo) / (hi - lo) : 0.5;
    t = clamp(t, 0, 1);
    var stops = [[48, 18, 59], [65, 68, 171], [70, 117, 237], [57, 162, 252],
      [27, 207, 212], [36, 236, 166], [97, 252, 108], [164, 252, 59],
      [209, 232, 52], [254, 155, 45], [243, 99, 21], [177, 25, 1]];
    var x = t * (stops.length - 1), i = Math.floor(x), f = x - i;
    var a = stops[i], b = stops[Math.min(stops.length - 1, i + 1)];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
      Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }

  function frameTime(t) { return clamp(Math.round(t), 0, T - 1); }

  function getScan(tsrc, mode, res) {
    var key = mode + ':' + tsrc + ':' + (res || 64);
    if (!scanCache[key]) {
      scanCache[key] = S.scan(tsrc, tsrc, tsrc, res || 64);
    }
    return scanCache[key];
  }

  function getPose() {    var key = mx.tsrc + ':' + mx.ttgt;
    if (!poseCache[key]) {
      var est = S.estimatePose(mx.tsrc, mx.tsrc, mx.ttgt, 7, 9);
      var f = S.estimateFocal(mx.tsrc);
      var gt = S.relativePoseGT(mx.tsrc, mx.ttgt);
      var out = { est: est, focal: f, gt: gt };
      if (est) {
        var tr = 0;
        for (var k = 0; k < 9; k++) tr += est.R[k] * gt.R[k];
        out.rotErr = Math.acos(clamp((tr - 1) / 2, -1, 1)) * 180 / Math.PI;
      }
      poseCache[key] = out;
    }
    return poseCache[key];
  }

  /* --------------------------------------------------------- 3D drawing  */
  /** Camera j in world coordinates, rebuilt from the estimated i<-j transform.
   *  X_i = R X_j + t  and  (R_i, e_i) known  =>  R_j = R^T R_i,
   *  e_j = R_j^T R^T (R_i e_i + t). */
  function estCamera(est, i, j) {
    var m = S._math;
    var Ri = S.cam(i).R, ei = S.cam(i).eye;
    var Rj = m.matMul(m.matT(est.R), Ri);
    var v = m.add(m.matVec(Ri, ei), est.t);
    var eye = m.matVec(m.matT(Rj), m.matVec(m.matT(est.R), v));
    return { eye: eye, R: Rj };
  }

  function frustumLines(eye, R, scale, color, alpha, dash) {
    var m = S._math;
    var tx = 0.5 * M.W / M.fx, ty = 0.5 * M.H / M.fy;
    var fwd = [R[6], R[7], R[8]], right = [R[0], R[1], R[2]], down = [R[3], R[4], R[5]];
    var corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (c) {
      return m.add(eye, m.add(m.scale(fwd, scale),
        m.add(m.scale(right, c[0] * scale * tx), m.scale(down, c[1] * scale * ty))));
    });
    var lines = [];
    corners.forEach(function (p, i) {
      lines.push({ a: eye, b: p, color: color, width: 1, alpha: alpha, dash: dash });
      lines.push({ a: p, b: corners[(i + 1) % 4], color: color, width: 1.2, alpha: alpha, dash: dash });
    });
    return lines;
  }

  function drawScene() {
    var m = S._math;
    var desc = { points: [], lines: [], polylines: [], labels: [], ground: true };
    var ts = mx.tsrc, tt = mx.ttgt, tc = mx.tcam;
    var frame = S.frames[ts];
    var q = S.query(mx.u, mx.v, ts, tt, tc);

    // faint camera path
    for (var k = 0; k < T; k++) {
      if (k === ts || k === tc) continue;
      var c = S.cam(k);
      frustumLines(c.eye, c.R, 0.42, 'rgba(120,160,210,1)', 0.16)
        .forEach(function (l) { desc.lines.push(l); });
    }

    if (mx.mode === 'cloud' || mx.mode === 'depth') {
      var sc = getScan(ts, mx.mode, 64), lo = Infinity, hi = -Infinity;
      sc.samples.forEach(function (s) { lo = Math.min(lo, s.z); hi = Math.max(hi, s.z); });
      sc.samples.forEach(function (s) {
        var col = mx.mode === 'cloud' ? PRIM_COLOR[s.prim] : depthColor(s.z, lo, hi);
        desc.points.push({ p: s.world, color: col, size: 2.6, alpha: 0.95 });
      });
      desc.labels.push({ p: [0, 1.9, 0], text: mx.mode === 'cloud'
        ? '解码点云 · ' + sc.samples.length + ' 个查询（完整分辨率 ' + (M.W * M.H).toLocaleString('en-US') + '）'
        : '深度着色 · ' + lo.toFixed(2) + ' → ' + hi.toFixed(2) + ' m' });
    } else {
      // base surface points at the source time
      var prims = frame.prims;
      for (var i = 0; i < S.points.length; i++) {
        var pt = S.points[i];
        var w = S.toWorld(prims[pt.p], pt.l);
        desc.points.push({ p: w, color: pt.c, size: 2.3, alpha: 0.62 });
      }
    }

    if (mx.mode === 'track') {
      var track = [], okAll = true;
      for (var kk = 0; kk < T; kk++) {
        var qk = S.query(mx.u, mx.v, ts, kk, ts);
        if (!qk) { okAll = false; break; }
        track.push(qk.world);
      }
      if (okAll && track.length > 1) {
        desc.polylines.push({ pts: track, color: '#ffd166', width: 2.6, alpha: 0.95, glow: true });
        track.forEach(function (p, idx) {
          var hot = idx === tt;
          desc.points.push({
            p: p, color: idx <= tt ? '#fff3d6' : '#8a7150',
            size: hot ? 6 : 3.6, alpha: hot ? 1 : 0.85
          });
        });
        desc.labels.push({ p: track[0], text: 't=0', dx: 7, dy: -8, color: '#9db4d0' });
        desc.labels.push({ p: track[T - 1], text: 't=' + (T - 1), dx: 7, dy: -8, color: '#9db4d0' });
      }
      if (q) {
        desc.lines.push({ a: q.ray.o, b: q.world, color: '#4cc9f0', width: 1.3, alpha: 0.75, dash: [4, 4] });
      }
    }

    if (q) {
      var pulse = 1 + 0.12 * Math.sin(Date.now() / 420);
      desc.points.push({ p: q.world, color: '#fff2e6', size: 9 * pulse, alpha: 0.28 });
      desc.points.push({ p: q.world, color: '#ff8a4c', size: 5.2, alpha: 1 });
      desc.labels.push({
        p: q.world, dx: 12, dy: -12, color: '#ffd9c0',
        text: 'P = (' + fmt(q.P[0], 2) + ', ' + fmt(q.P[1], 2) + ', ' + fmt(q.P[2], 2) + ')'
      });
    }

    // source camera (cyan) and reference camera (violet)
    var cs = S.cam(ts), cc = S.cam(tc);
    frustumLines(cs.eye, cs.R, 0.62, '#4cc9f0', 0.85).forEach(function (l) { desc.lines.push(l); });
    desc.labels.push({ p: cs.eye, text: 't_src ' + ts, dx: 8, dy: -10, color: '#b3ecff' });
    if (tc !== ts) {
      frustumLines(cc.eye, cc.R, 0.62, '#b57bff', 0.8).forEach(function (l) { desc.lines.push(l); });
      desc.labels.push({ p: cc.eye, text: 't_cam ' + tc, dx: 8, dy: -10, color: '#d9c4ff' });
    }

    if (mx.mode === 'pose') {
      var P = getPose();
      if (P.est) {
        var gi = S.cam(ts);
        var est = estCamera(P.est, ts, tt);
        desc.labels.push({ p: est.eye, text: '估计 t_cam ' + tt, dx: 8, dy: 22, color: '#ffb27a' });
        frustumLines(est.eye, est.R, 0.62, '#ff8a4c', 0.95, [5, 4]).forEach(function (l) { desc.lines.push(l); });
        // the query ensemble, drawn where it was decoded (source camera frame i)
        P.est.A.slice(0, 40).forEach(function (p) {
          var world = m.add(gi.eye, m.matVec(m.matT(gi.R), p));
          desc.points.push({ p: world, color: '#ffd9c0', size: 2.6, alpha: 0.75 });
        });
      }
    }

    return desc;
  }

  /* ------------------------------------------------------- source frame  */
  var FRAME_SCALE = 2;
  function renderFrame() {
    var cv = $('#frame-canvas');
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var t = mx.tsrc;
    var cam = S.cam(t);
    var m = S._math;

    var BG = ctx.createLinearGradient(0, 0, 0, H);
    BG.addColorStop(0, '#0b1524');
    BG.addColorStop(0.62, '#0a111c');
    BG.addColorStop(1, '#070c14');
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // horizon glow
    var hz = ctx.createRadialGradient(W * 0.5, H * 0.28, 4, W * 0.5, H * 0.3, W * 0.6);
    hz.addColorStop(0, 'rgba(76,201,240,0.07)');
    hz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hz;
    ctx.fillRect(0, 0, W, H);

    // ground grid
    ctx.lineWidth = 1;
    for (var g = -4; g <= 4; g++) {
      [[[g, M.groundY, -4.2], [g, M.groundY, 4.2]], [[-4.2, M.groundY, g], [4.2, M.groundY, g]]].forEach(function (seg) {
        var a = S.project(cam, seg[0]), b = S.project(cam, seg[1]);
        if (!a || !b) return;
        ctx.strokeStyle = 'rgba(90,130,175,0.13)';
        ctx.beginPath();
        ctx.moveTo(a.u * W, a.v * H);
        ctx.lineTo(b.u * W, b.v * H);
        ctx.stroke();
      });
    }

    var pts = [];
    if (mx.mode === 'depth') {
      var sc = getScan(t, 'depth', 96), lo = Infinity, hi = -Infinity;
      sc.samples.forEach(function (s) { lo = Math.min(lo, s.z); hi = Math.max(hi, s.z); });
      sc.samples.forEach(function (s) {
        pts.push({ x: s.u * W, y: s.v * H, z: s.z, c: depthColor(s.z, lo, hi), s: 4 });
      });
    } else {
      var prims = cam.prims;
      for (var i = 0; i < S.points.length; i++) {
        var pt = S.points[i];
        var w = S.toWorld(prims[pt.p], pt.l);
        var p = S.project(cam, w);
        if (!p) continue;
        if (p.u < -0.05 || p.u > 1.05 || p.v < -0.05 || p.v > 1.05) continue;
        pts.push({ x: p.u * W, y: p.v * H, z: p.z, c: pt.c, s: 2.1 });
      }
      pts.sort(function (a, b) { return b.z - a.z; });
    }

    for (var j = 0; j < pts.length; j++) {
      var q = pts[j];
      ctx.globalAlpha = clamp(1.35 - q.z / 22, 0.28, 1);
      ctx.fillStyle = q.c;
      var s = q.s;
      ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    // crosshair (dimmed when the mode sweeps pixels instead of picking one)
    var cu = mx.u * W, cv2 = mx.v * H;
    ctx.globalAlpha = mx.mode === 'track' ? 1 : 0.28;
    ctx.strokeStyle = 'rgba(255,138,76,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cu, cv2, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cu - 13, cv2); ctx.lineTo(cu - 9, cv2);
    ctx.moveTo(cu + 9, cv2); ctx.lineTo(cu + 13, cv2);
    ctx.moveTo(cu, cv2 - 13); ctx.lineTo(cu, cv2 - 9);
    ctx.moveTo(cu, cv2 + 9); ctx.lineTo(cu, cv2 + 13);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(120,150,185,0.85)';
    ctx.font = '600 11px ui-monospace, Consolas, monospace';
    ctx.fillText('t_src = ' + t + ' · ' + (mx.mode === 'depth' ? 'DEPTH' : 'RGB'), 10, 18);

    if (mx.mode === 'depth') {
      var barX = W - 16, barY = 34, barH = H - 76;
      var grad = ctx.createLinearGradient(0, barY + barH, 0, barY);
      for (var g2 = 0; g2 <= 10; g2++) {
        grad.addColorStop(g2 / 10, depthColor(g2 / 10, 0, 1));
      }
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, 7, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX + 0.5, barY + 0.5, 6, barH - 1);
      ctx.fillStyle = 'rgba(150,175,205,0.9)';
      ctx.font = '9px ui-monospace, Consolas, monospace';
      ctx.fillText('NEAR', barX - 30, barY + 8);
      ctx.fillText('FAR', barX - 24, barY + barH - 2);
    }
  }

  /* ------------------------------------------------------------- readout */
  function updateReadout() {
    var q = S.query(mx.u, mx.v, mx.tsrc, mx.ttgt, mx.tcam);
    $('#ro-p').textContent = q
      ? '(' + fmt(q.P[0], 2) + ', ' + fmt(q.P[1], 2) + ', ' + fmt(q.P[2], 2) + ')'
      : '— 看向天空';
    $('#ro-t').textContent = 'src ' + mx.tsrc + ' · tgt ' + mx.ttgt + ' · cam ' + mx.tcam;
    $('#m-u').textContent = fmt(mx.u, 3);
    $('#m-v').textContent = fmt(mx.v, 3);
    $('#m-prim').textContent = q ? S.primNames[q.prim] : '天空';
    var fh = $('#frame-hit');
    if (fh) {
      fh.innerHTML = q
        ? '<div class="fh-row"><span>命中</span><span>' + S.primNames[q.prim] + '</span></div>' +
          '<div class="fh-row"><span>世界坐标</span><span>' + fmt(q.world[0], 2) + ', ' + fmt(q.world[1], 2) +
          ', ' + fmt(q.world[2], 2) + '</span></div>' +
          '<div class="fh-row"><span>相机系 P</span><span>' + fmt(q.P[0], 2) + ', ' + fmt(q.P[1], 2) +
          ', ' + fmt(q.P[2], 2) + '</span></div>'
        : '<div class="fh-row"><span>该像素看向天空，没有可解码的表面点</span></div>';
    }
    $('#frame-badge').textContent = 'frame ' + mx.tsrc;
    var mode = D.modes[mx.mode];
    $('#task-name').textContent = mode.name + ' · ' + mode.badge;
    $('#task-meta').textContent = mode.queries;
    $('#task-formula').textContent = mode.formula;

    var pose = $('#pose-result');
    if (mx.mode === 'pose') {
      var P = getPose();
      pose.classList.add('on');
      if (!P.est) { pose.innerHTML = '<div class="pr-row">对应点不足</div>'; }
      else {
        var m = S._math;
        var est = estCamera(P.est, mx.tsrc, mx.ttgt);
        var tErr = m.norm(m.sub(est.eye, S.cam(mx.ttgt).eye));
        var fErr = Math.abs(P.focal.value - M.fx / M.W) / (M.fx / M.W) * 100;
        pose.innerHTML =
          '<div class="pr-row"><span>对应点</span><b>' + P.est.n + ' 组</b></div>' +
          '<div class="pr-row"><span>旋转误差</span><b class="ok">' + P.rotErr.toExponential(1) + '°</b></div>' +
          '<div class="pr-row"><span>平移误差</span><b class="ok">' + tErr.toExponential(1) + ' m</b></div>' +
          '<div class="pr-row"><span>焦距 f/W</span><b>' + P.focal.value.toFixed(5) + '</b></div>' +
          '<div class="pr-row"><span>焦距误差</span><b class="ok">' + fErr.toExponential(1) + '%</b></div>';
      }
    } else {
      pose.classList.remove('on');
      pose.innerHTML = '';
    }
  }

  function updateModeUI() {
    $$('#mode-switch button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === mx.mode); });
    $$('.tm-row').forEach(function (r) { r.classList.toggle('on', r.dataset.row === mx.mode); });
    var mode = D.modes[mx.mode];
    $('#mode-explain').innerHTML = '<h4>' + mode.name + ' · ' + mode.row + '</h4>' +
      '<p>' + mode.desc + '</p><div class="note">' + mode.note + '</div>';
    var locked = mx.mode !== 'track';
    $('#seg-tsrc').querySelectorAll('button').forEach(function (b) { b.disabled = false; });
    $('#seg-ttgt').querySelectorAll('button').forEach(function (b) { b.disabled = locked || mx.mode === 'pose'; });
    $('#seg-tcam').querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    ['#sl-u', '#sl-v'].forEach(function (id) { $(id).disabled = locked; });
    $('#btn-play').classList.toggle('on', mx.playing);
  }

  function refresh() {
    syncControls();
    renderFrame();
    updateReadout();
    updateModeUI();
    if (viewer) viewer.invalidate();
  }

  function syncControls() {
    ['tsrc', 'ttgt', 'tcam'].forEach(function (k) {
      $$('#seg-' + k + ' button').forEach(function (b) {
        b.classList.toggle('on', Number(b.dataset.v) === mx[k]);
      });
      var out = $('#out-' + k);
      if (out) out.textContent = mx[k];
    });
    $$('#tsrc-row button').forEach(function (b) { b.classList.toggle('on', Number(b.dataset.v) === mx.tsrc); });
    $$('#scrub-track button').forEach(function (b) {
      var v = Number(b.dataset.v);
      b.classList.toggle('on', v === mx.ttgt);
      b.classList.toggle('past', v < mx.ttgt);
    });
    var su = $('#sl-u'), sv = $('#sl-v');
    su.value = mx.u; sv.value = mx.v;
    su.style.setProperty('--p', (mx.u * 100) + '%');
    sv.style.setProperty('--p', (mx.v * 100) + '%');
    $('#out-u').textContent = fmt(mx.u, 3);
    $('#out-v').textContent = fmt(mx.v, 3);
  }

  function setPatch(p, opts) {
    Object.keys(p).forEach(function (k) { mx[k] = p[k]; });
    if (mx.mode === 'track') mx.tcam = mx.tsrc;
    if (mx.mode === 'cloud' || mx.mode === 'depth') { mx.ttgt = mx.tsrc; mx.tcam = mx.tsrc; }
    if (mx.mode === 'pose') mx.tcam = mx.ttgt;
    refresh();
  }

  /* ---------------------------------------------------------------- init */
  function buildSeg(id, key) {
    var host = $(id);
    var html = '';
    for (var i = 0; i < T; i++) html += '<button data-v="' + i + '">' + i + '</button>';
    host.innerHTML = html;
    host.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        var patch = {}; patch[key] = Number(b.dataset.v);
        setPatch(patch);
      });
    });
  }

  function initMatrix() {
    viewer = new window.Viewer3D($('#view3d'), {
      target: [0, 0.25, 0], dist: 8.8, yaw: -0.86, pitch: 0.36, fov: 36
    });
    viewer.groundY = M.groundY;
    viewer.setDrawFn(drawScene);

    // start with the cursor on the planet: a query that lands on a moving
    // object is far more informative than one that grazes the far ground
    var pc = S.frames[0].prims[4].c;
    var pp = S.project(S.cam(0), pc);
    if (pp) {
      mx.u = clamp(pp.u, 0.08, 0.92);
      mx.v = clamp(pp.v, 0.08, 0.92);
    }

    buildSeg('#seg-tsrc', 'tsrc');
    buildSeg('#seg-ttgt', 'ttgt');
    buildSeg('#seg-tcam', 'tcam');

    var rowHtml = '';
    for (var i = 0; i < T; i++) rowHtml += '<button data-v="' + i + '">' + i + '</button>';
    $('#tsrc-row').innerHTML = rowHtml;
    $('#tsrc-row').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { setPatch({ tsrc: Number(b.dataset.v) }); });
    });

    var scrubHtml = '';
    for (var j = 0; j < T; j++) scrubHtml += '<button data-v="' + j + '" title="t_tgt = ' + j + '"></button>';
    $('#scrub-track').innerHTML = scrubHtml;
    $('#scrub-track').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { setPatch({ ttgt: Number(b.dataset.v) }); });
    });

    $('#sl-u').addEventListener('input', function (e) { setPatch({ u: Number(e.target.value) }); });
    $('#sl-v').addEventListener('input', function (e) { setPatch({ v: Number(e.target.value) }); });

    $$('#mode-switch button').forEach(function (b) {
      b.addEventListener('click', function () {
        mx.mode = b.dataset.mode;
        if (mx.mode === 'track') { mx.ttgt = 3; mx.tcam = mx.tsrc; }
        if (mx.mode === 'cloud' || mx.mode === 'depth') { mx.ttgt = mx.tsrc; mx.tcam = mx.tsrc; }
        if (mx.mode === 'pose') { mx.ttgt = Math.min(T - 1, mx.tsrc + 4); mx.tcam = mx.ttgt; }
        mx.playing = false;
        if (mx.timer) { clearInterval(mx.timer); mx.timer = null; }
        refresh();
      });
    });

    $('#btn-reset').addEventListener('click', function () { viewer.reset(); });
    $('#btn-play').addEventListener('click', function () {
      mx.playing = !mx.playing;
      if (mx.playing) {
        mx.timer = setInterval(function () {
          mx.ttgt = (mx.ttgt + 1) % T;
          refresh();
        }, 480);
      } else if (mx.timer) { clearInterval(mx.timer); mx.timer = null; }
      $('#btn-play').classList.toggle('on', mx.playing);
      $('#btn-play').textContent = mx.playing ? '⏸' : '▶';
    });

    // click / drag on the source frame to pick (u, v)
    var fc = $('#frame-canvas');
    var picking = false;
    function pick(e) {
      var r = fc.getBoundingClientRect();
      setPatch({
        u: clamp((e.clientX - r.left) / r.width, 0.015, 0.985),
        v: clamp((e.clientY - r.top) / r.height, 0.015, 0.985)
      });
      var hint = $('#frame-hint');
      hint.style.opacity = 0;
    }
    fc.addEventListener('pointerdown', function (e) { picking = true; fc.setPointerCapture(e.pointerId); pick(e); });
    fc.addEventListener('pointermove', function (e) { if (picking) pick(e); });
    fc.addEventListener('pointerup', function () { picking = false; });
    fc.addEventListener('pointercancel', function () { picking = false; });

    document.addEventListener('keydown', function (e) {
      if ($('#view-matrix').classList.contains('on') && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        if (e.key === 'ArrowRight') { setPatch({ ttgt: Math.min(T - 1, mx.ttgt + 1) }); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { setPatch({ ttgt: Math.max(0, mx.ttgt - 1) }); e.preventDefault(); }
      }
    });

    applyUrlState();
    refresh();
  }

  /** Deep link into a specific query: ?mode=cloud&tsrc=2&ttgt=4&u=0.4&v=0.5 */
  function applyUrlState() {
    var qs;
    try { qs = new URLSearchParams(location.search); } catch (e) { return; }
    var mode = qs.get('mode');
    if (mode && D.modes[mode]) {
      mx.mode = mode;
      if (mode === 'pose') { mx.ttgt = Math.min(T - 1, mx.tsrc + 4); mx.tcam = mx.ttgt; }
    }
    ['tsrc', 'ttgt', 'tcam'].forEach(function (k) {
      var v = qs.get(k);
      if (v !== null && v !== '' && !isNaN(Number(v))) mx[k] = clamp(Math.round(Number(v)), 0, T - 1);
    });
    ['u', 'v'].forEach(function (k) {
      var v = qs.get(k);
      if (v !== null && v !== '' && !isNaN(Number(v))) mx[k] = clamp(Number(v), 0.02, 0.98);
    });
    if (mx.mode === 'track') mx.tcam = mx.tsrc;
    if (mx.mode === 'cloud' || mx.mode === 'depth') { mx.ttgt = mx.tsrc; mx.tcam = mx.tsrc; }
    if (mx.mode === 'pose') mx.tcam = mx.ttgt;
  }

  /* ============================================================== ANATOMY */
  var anStep = 0;
  function renderAnatomy() {
    $('#pipeline').innerHTML = D.anatomy.map(function (s, i) {
      return '<button class="pipe-step" data-i="' + i + '"><b>' + String(i + 1).padStart(2, '0') +
        '</b>' + (s.short || s.title) + '</button>' +
        (i < D.anatomy.length - 1 ? '<span class="pipe-arrow">→</span>' : '');
    }).join('');
    $$('#pipeline .pipe-step').forEach(function (b) {
      b.addEventListener('click', function () { anStep = Number(b.dataset.i); paintAnatomy(); });
    });
    $('#stepper').innerHTML = D.anatomy.map(function (s, i) {
      return '<li><button data-i="' + i + '"><span class="idx">' + (i + 1) + '</span>' + s.title + '</button></li>';
    }).join('');
    $$('#stepper button').forEach(function (b) {
      b.addEventListener('click', function () { anStep = Number(b.dataset.i); paintAnatomy(); });
    });
    paintAnatomy();
  }

  function paintAnatomy() {
    $$('#pipeline .pipe-step').forEach(function (b) { b.classList.toggle('on', Number(b.dataset.i) === anStep); });
    $$('#stepper button').forEach(function (b) { b.classList.toggle('on', Number(b.dataset.i) === anStep); });
    var s = D.anatomy[anStep];
    var html = '<div class="kicker">' + s.kicker + '</div><h2>' + s.title + '</h2>' +
      '<p class="essence">' + s.essence + '</p>' +
      '<div class="why">' + s.why.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '</div>';
    if (s.formula) html += '<h3>公式</h3><div class="formula">' + esc(s.formula) + '</div>';
    if (s.code) html += '<h3>伪代码</h3><pre class="code"><code>' + esc(s.code) + '</code></pre>';
    html += '<div class="pitfall"><b>常见误解 · </b>' + s.pitfall + '</div>' +
      '<div class="where">论文位置 · ' + s.where + '</div>';
    $('#detail').innerHTML = html;
  }

  /* ============================================================== TRAINER */
  var cardQueue = [], cardIdx = 0, cardFlipped = false;

  function cardState(id) {
    if (!store.cards[id]) store.cards[id] = { box: 0, due: 0, seen: 0 };
    return store.cards[id];
  }

  function buildQueue() {
    var now = Date.now();
    var due = D.cards.filter(function (c) { return cardState(c.id).due <= now; });
    due.sort(function (a, b) {
      var A = cardState(a.id), B = cardState(b.id);
      return (A.due - B.due) || (A.box - B.box);
    });
    cardQueue = due;
    cardIdx = 0;
  }

  var INTERVALS = [0, 10 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3];

  function renderCard() {
    var total = D.cards.length;
    var mastered = D.cards.filter(function (c) { return cardState(c.id).box >= 3; }).length;
    var learning = D.cards.filter(function (c) { var b = cardState(c.id).box; return b > 0 && b < 3; }).length;
    $('#kv-mastered').textContent = mastered;
    $('#kv-learning').textContent = learning;
    $('#kv-new').textContent = total - mastered - learning;
    var pct = Math.round(mastered / total * 100);
    $('#ring-val').textContent = pct + '%';
    $('#card-ring').style.background = 'conic-gradient(var(--orange) ' + (pct * 3.6) + 'deg, var(--line) 0deg)';

    var card = cardQueue[cardIdx];
    var el = $('#flashcard');
    el.classList.remove('flipped');
    cardFlipped = false;
    if (!card) {
      $('#card-counter').textContent = '今天复习完了';
      $('#card-box').textContent = '';
      $('#fc-q').textContent = '这一轮没有待复习的卡片。';
      $('#fc-a').textContent = '你可以在下面的「学习路线」里导出报告，或者点击这里把全部卡片重置，再刷一轮。';
      $('#fc-ref').textContent = '';
      $('#flashcard').onclick = function () {
        D.cards.forEach(function (c) { store.cards[c.id] = { box: 0, due: 0, seen: 0 }; });
        save(); buildQueue(); renderCard();
      };
      return;
    }
    $('#card-counter').textContent = '剩余 ' + (cardQueue.length - cardIdx) + ' 张 / 本轮';
    $('#card-box').textContent = 'BOX ' + cardState(card.id).box;
    $('#fc-q').textContent = card.q;
    $('#fc-a').textContent = card.a;
    $('#fc-ref').textContent = card.ref + ' · 间隔重复';
    $('#flashcard').onclick = function () {
      el.classList.toggle('flipped');
      cardFlipped = el.classList.contains('flipped');
    };
  }

  function gradeCard(g) {
    var card = cardQueue[cardIdx];
    if (!card) return;
    var st = cardState(card.id);
    st.seen = (st.seen || 0) + 1;
    if (g === 0) st.box = 0;
    else if (g === 1) st.box = Math.max(1, st.box);
    else if (g === 2) st.box = Math.min(4, Math.max(1, st.box + 1));
    else st.box = Math.min(4, st.box + 2);
    st.due = Date.now() + INTERVALS[st.box];
    save();
    cardIdx++;
    if (cardIdx >= cardQueue.length) buildQueue();
    renderCard();
  }

  var quizState = { i: 0, score: 0, answered: false };

  function renderQuiz() {
    var q = D.quiz[quizState.i];
    $('#quiz-progress').textContent = '第 ' + (quizState.i + 1) + ' / ' + D.quiz.length + ' 题';
    $('#quiz-best').textContent = store.quiz.best ? '历史最佳 ' + store.quiz.best + '/' + D.quiz.length : '历史最佳 —';
    if (!q) {
      var pct = Math.round(quizState.score / D.quiz.length * 100);
      $('#q-text').textContent = '完成：' + quizState.score + ' / ' + D.quiz.length + '（' + pct + '%）';
      $('#q-options').innerHTML = '<div class="q-opt" style="cursor:default">' +
        (pct >= 80 ? '很好。接下来去「学习路线」第 5 天，写你的 review。' :
          pct >= 50 ? '基本概念有了，建议回「架构解剖」把第 04 步（独立解码）再读一遍。' :
            '建议回到「查询矩阵」，把 t_cam 单独拨动几次，再来看这些题。') + '</div>';
      $('#q-feedback').classList.remove('on');
      $('#q-next').disabled = true;
      store.quiz.attempts = (store.quiz.attempts || 0) + 1;
      store.quiz.best = Math.max(store.quiz.best || 0, quizState.score);
      save();
      return;
    }
    $('#q-text').textContent = q.q;
    $('#q-options').innerHTML = q.options.map(function (o, i) {
      return '<button class="q-opt" data-i="' + i + '"><span class="k">' + 'ABCD'[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join('');
    $('#q-feedback').classList.remove('on');
    $('#q-feedback').innerHTML = '';
    $('#q-next').disabled = true;
    $('#q-next').textContent = '下一题 →';
    quizState.answered = false;
    $$('#q-options .q-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (quizState.answered) return;
        quizState.answered = true;
        var chosen = Number(b.dataset.i);
        var right = chosen === q.answer;
        if (right) quizState.score++;
        $$('#q-options .q-opt').forEach(function (x, i) {
          x.disabled = true;
          if (i === q.answer) x.classList.add('correct');
          if (i === chosen && !right) x.classList.add('wrong');
        });
        $('#q-feedback').innerHTML =
          '<b>' + (right ? '正确。' : '再想想。') + '</b>' + esc(q.explain) +
          '<span class="ref">论文位置 · ' + esc(q.ref) + '</span>';
        $('#q-feedback').classList.add('on');
        $('#q-next').disabled = false;
        $('#q-next').textContent = quizState.i === D.quiz.length - 1 ? '看结果 →' : '下一题 →';
      });
    });
  }

  function initTrainer() {
    $$('#trainer-switch button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('#trainer-switch button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        $$('.sub').forEach(function (s) { s.classList.remove('on'); });
        $('#sub-' + b.dataset.sub).classList.add('on');
      });
    });

    buildQueue();
    renderCard();
    $$('.grade').forEach(function (b) {
      b.addEventListener('click', function () { gradeCard(Number(b.dataset.grade)); });
    });
    document.addEventListener('keydown', function (e) {
      if (!$('#view-trainer').classList.contains('on')) return;
      if (!$('#sub-cards').classList.contains('on')) return;
      if (e.key === ' ') { e.preventDefault(); $('#flashcard').click(); }
      if (['1', '2', '3', '4'].indexOf(e.key) >= 0) gradeCard(Number(e.key) - 1);
    });

    $('#q-next').addEventListener('click', function () {
      quizState.i++;
      renderQuiz();
    });
    $('#q-restart').addEventListener('click', function () {
      quizState = { i: 0, score: 0, answered: false };
      renderQuiz();
    });
    renderQuiz();

    $('#socratic-grid').innerHTML = D.socratic.map(function (s) {      return '<div class="soc-card" data-id="' + s.id + '">' +
        '<div class="q">' + s.prompt + '</div>' +
        '<div class="hint">提示：' + s.hint + '</div>' +
        '<textarea placeholder="写下你的回答…（自动保存）"></textarea>' +
        '<div class="rubric">' + s.rubric.map(function (r, i) {
          return '<label><input type="checkbox" data-i="' + i + '"> ' + r + '</label>';
        }).join('') + '</div>' +
        '<div class="saved">已保存</div></div>';
    }).join('');
    $$('#socratic-grid .soc-card').forEach(function (cardEl) {
      var id = cardEl.dataset.id;
      var ta = cardEl.querySelector('textarea');
      ta.value = store.answers[id] || '';
      var saved = cardEl.querySelector('.saved');
      var timer = null;
      ta.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          store.answers[id] = ta.value; save();
          saved.classList.add('on');
          setTimeout(function () { saved.classList.remove('on'); }, 1200);
        }, 400);
      });
      cardEl.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
        var key = id + ':' + cb.dataset.i;
        cb.checked = !!store.rubric[key];
        cb.addEventListener('change', function () { store.rubric[key] = cb.checked; save(); });
      });
    });

    // deep link: ?sub=quiz
    var qs;
    try { qs = new URLSearchParams(location.search); } catch (e) { return; }
    var sub = qs.get('sub');
    if (sub && ['cards', 'quiz', 'socratic'].indexOf(sub) >= 0) {
      var btn = $$('#trainer-switch button').filter(function (b) { return b.dataset.sub === sub; })[0];
      if (btn) btn.click();
    }
  }

  /* ================================================================= PATH */
  function renderPath() {
    $('#path-grid').innerHTML = D.path.map(function (d) {
      var done = !!store.path[d.day];
      return '<div class="day' + (done ? ' done' : '') + '" data-day="' + d.day + '">' +
        '<div class="d-top"><span class="d-num">DAY ' + d.day + '</span>' +
        '<input type="checkbox" class="d-check"' + (done ? ' checked' : '') + ' aria-label="标记完成"></div>' +
        '<h3>' + d.title + '</h3>' +
        '<p class="goal">' + d.goal + '</p>' +
        '<ul>' + d.actions.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>' +
        '<div class="out"><b>产出</b> · ' + d.deliverable + '</div>' +
        '<div class="chk"><b>自检</b> · ' + d.check + '</div></div>';
    }).join('');
    $$('.day').forEach(function (el) {
      var day = Number(el.dataset.day);
      el.querySelector('.d-check').addEventListener('change', function (e) {
        store.path[day] = e.target.checked; save();
        el.classList.toggle('done', e.target.checked);
        renderReport();
      });
    });

    $('#tips-grid').innerHTML = D.readingTips.map(function (t) {
      return '<div class="tip-card"><h3>' + t.t + '</h3><p>' + t.b + '</p></div>';
    }).join('');
    renderReport();
  }

  function buildReport() {
    var total = D.cards.length;
    var mastered = D.cards.filter(function (c) { return cardState(c.id).box >= 3; }).length;
    var days = D.path.filter(function (d) { return store.path[d.day]; }).length;
    var answered = D.socratic.filter(function (s) { return (store.answers[s.id] || '').trim().length > 10; }).length;
    var weak = D.cards.filter(function (c) { return cardState(c.id).box <= 1; }).slice(0, 5)
      .map(function (c) { return '  - ' + c.q; });
    var lines = [
      '# D4RT 论文实验室 · 学习报告',
      '',
      '- 生成时间：' + new Date().toLocaleString('zh-CN'),
      '- 锚点论文：Efficiently Reconstructing Dynamic Scenes One D4RT at a Time（CVPR 2026 最佳论文，arXiv:2512.08924）',
      '',
      '## 进度',
      '- 记忆卡：已掌握 ' + mastered + ' / ' + total + '（' + Math.round(mastered / total * 100) + '%）',
      '- 概念自测：历史最佳 ' + (store.quiz.best || 0) + ' / ' + D.quiz.length + '，累计作答 ' + (store.quiz.attempts || 0) + ' 次',
      '- 五天路线：完成 ' + days + ' / 5 天',
      '- 苏格拉底问答：已完成 ' + answered + ' / ' + D.socratic.length + ' 题',
      '- 几何自检：' + (SELFCHECK ? SELFCHECK.pass + '/' + SELFCHECK.total + ' 通过' : '未运行'),
      '',
      '## 还需要加固',
      weak.length ? weak.join('\n') : '  - 暂无明显薄弱项',
      '',
      '## 我的复述（苏格拉底）'
    ];
    D.socratic.forEach(function (s) {
      var a = (store.answers[s.id] || '').trim();
      lines.push('', '### ' + s.prompt, a ? a : '（未作答）');
    });
    lines.push('', '---', '本报告由「D4RT 论文实验室」生成。论文事实以官方来源为准；实验室中的 3D 点为解析真值，非网络预测。');
    return lines.join('\n');
  }

  function renderReport() { $('#report-body').textContent = buildReport(); }

  function initPath() {
    renderPath();
    $('#btn-export').addEventListener('click', function () {
      var blob = new Blob([buildReport()], { type: 'text/markdown;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'd4rt-lab-report.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    });
  }

  /* ================================================================ BOOT */
  function boot() {
    SELFCHECK = S.selfTest();
    $('#check-count').textContent = SELFCHECK.pass + '/' + SELFCHECK.total;
    $('#selfcheck').title = SELFCHECK.details.map(function (d) {
      return (d.ok ? '✓ ' : '✗ ') + d.name + (d.info ? ' — ' + d.info : '');
    }).join('\n');
    $('#foot-check').textContent = '几何自检 ' + SELFCHECK.pass + '/' + SELFCHECK.total;

    renderOverview();
    renderRadar();
    initMatrix();
    renderAnatomy();
    initTrainer();
    initPath();

    var hash = (location.hash || '').replace('#', '');
    goTab(TABS.indexOf(hash) >= 0 ? hash : 'overview', true);

    if (SELFCHECK.pass !== SELFCHECK.total) {
      console.warn('self-check failed', SELFCHECK.details);
    }
    if (/(^|[?&])debug=1/.test(location.search)) debugLayout();
  }

  /** ?debug=1 -- report elements wider than the viewport (layout triage). */
  function debugLayout() {
    var vw = document.documentElement.clientWidth;
    var lines = ['viewport ' + vw + '  scrollWidth ' + document.documentElement.scrollWidth];
    $$('body *').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > vw + 1) {
        lines.push(Math.round(r.width) + 'px  ' + el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') + '.' + (el.className || '').toString().slice(0, 40));
      }
    });
    var pre = document.createElement('pre');
    pre.id = 'debug-panel';
    pre.textContent = lines.slice(0, 40).join('\n');
    document.body.appendChild(pre);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
