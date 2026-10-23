# 扩展指南：把同一套交互用到另一篇论文

界面代码不认识任何具体论文。所有内容都在 `web/js/data.js` 的 `LAB_DATA` 里，几何在 `lab/`。所以「加一篇论文」和「换一个锚点」都是改数据，不改逻辑。

---

## 1. 只加一篇论文（5 分钟）

在 `LAB_DATA.papers` 里追加一个对象：

```js
{
  id: 'vggt',
  venue: 'CVPR 2025', year: 2025,
  award: '最佳论文',          // 显示在卡片上
  awardKind: 'best',          // best | student | hm —— 决定徽章颜色
  title: 'VGGT: Visual Geometry Grounded Transformer',
  authors: 'Jianyuan Wang, …',
  org: 'Oxford VGG · Meta AI',
  one: '一句话：它到底做了什么',
  why: '为什么值得读 / 它在谱系里的位置',
  learn: ['读完能获得的能力 A', '能力 B'],
  tags: ['feed-forward', 'geometry'],
  links: [{ l: 'arXiv 2503.11651', u: 'https://arxiv.org/abs/2503.11651' }]
}
```

保存刷新即可。雷达页会自动渲染、筛选、计数。

---

## 2. 换锚点论文（半天）

锚点论文决定了「查询矩阵」和「架构解剖」的内容。三步：

### ① 换解剖（7 步）

`LAB_DATA.anatomy` 是一个长度可为 5–8 的数组，每项：

```js
{
  id: 'encoder',
  kicker: '02 · 编码',
  short: '编码器',                 // 顶部流程条的短标签
  title: '整段视频先压成一个固定的全局表示',
  essence: '一句话本质（会以大字号显示）',
  why: ['第一段理由', '第二段理由'],   // 每段一个 <p>
  formula: 'F = E(V) …',           // 可为 null
  code: 'F = E(V)\n…',             // 可为 null，会被转义后显示为代码块
  pitfall: '最常见的误解是什么，为什么错',
  where: '§2.2 Model Architecture'
}
```

写作建议：`essence` 控制在 40 字内；`pitfall` 必须写出「为什么错」，而不只是「不是这样」。

### ② 换查询模式

`LAB_DATA.modes` 有四个键：`track / cloud / depth / pose`。如果新论文的接口不是五元组，最省事的做法是：

- 保留四个模式名，把 `desc / formula / queries / note` 换成新论文的说法；
- 若要改维度数量，需要同步改 `app.js` 的 `drawScene()` 与控件区——这是唯一需要动代码的地方。

### ③ 换场景（可选）

`lab/scene.py` 里有两个函数决定画面：

- `camera_at(t)`：相机轨迹（位置 + 看向哪里）
- `build_frame(t)`：每一帧的几何（地面、方块、行星、卫星）

改完执行：

```bash
cd lab
python verify.py      # 先确认几何自检全绿
python preview.py 0   # 渲染一张取景图，看看构图
python export.py      # 烘焙到前端
```

`verify.py` 里的 11 项检查会自动适配（它们只依赖 `query()` 的语义，不依赖具体场景）。

---

## 3. 加题 / 加卡 / 加路线

```js
// 记忆卡
{ id: 'c21', q: '问题', a: '答案', ref: '§2.2' }

// 自测题：answer 是正确选项的下标
{ id: 'q13', q: '题干', options: ['A', 'B', 'C', 'D'], answer: 1,
  explain: '为什么', ref: 'Table 1' }

// 苏格拉底式提问
{ id: 's5', prompt: '开放问题', hint: '提示', rubric: ['评分要点 1', '要点 2'] }
```

进度存在 `localStorage` 的 `d4rt-lab-v1` 键下，换内容不会丢进度（除非改了 `id`）。

---

## 4. 想接真实模型？

`scene.js` 里的 `query()` 是唯一需要替换的函数。它现在的签名是：

```js
query(u, v, tSrc, tTgt, tCam) -> { P, world, prim, local, depth } | null
```

接 D4RT 推理时：

1. 离线跑一遍视频，把所有可能的查询结果缓存成表（或按需请求后端）；
2. 让 `query()` 查表返回 `{ P, world: null, prim: -1 }`；
3. 界面里 `prim` 为 `-1` 时显示「预测」而不是材质名。

这样「查询矩阵」不用改一行，就变成了「真值 vs 预测」的对照实验台。

---

## 5. 移植到小程序

`scene.js` 只依赖 `window.SCENE_DATA` 与纯数学，没有 DOM。移植时：

- 把 `window.*` 改成 `module.exports` / 小程序模块；
- `render3d.js` 用的是 Canvas 2D 同构 API，把 `canvas.getContext('2d')` 换成 `wx.createCanvasContext` 或 Canvas 2D 接口，`requestAnimationFrame` 换成 `canvas.requestAnimationFrame`；
- `data.js` 与 `scene-data.js` 原样搬过去。

投影、求交、Umeyama 这些数学一行都不用改——它们不碰任何平台 API。
