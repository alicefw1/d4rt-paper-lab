# 论文雷达：2025–2026 顶会获奖图谱

这份文档是界面里「论文雷达」的展开版，回答一个问题：**如果你只有一个月，应该顺着哪条线读？**

结论先说：顺着「前馈几何」这条线读。2025 与 2026 两届 CVPR 最佳论文恰好是这条线的两个阶段，并且它同时踩中了三个正在收敛的方向——统一接口、动态场景、按需计算。

---

## 1. 两年的最佳论文，一个故事

### CVPR 2025 · VGGT

> *VGGT: Visual Geometry Grounded Transformer*
> Jianyuan Wang, Minghao Chen, Nikita Karaev, Andrea Vedaldi, Christian Rupprecht, David Novotny
> Oxford VGG · Meta AI · [arXiv:2503.11651](https://arxiv.org/abs/2503.11651)

**它做了什么**：读入 1–N 张图，一次前向直接回归相机参数、深度图、点图（point map）和点追踪。

**为什么重要**：在此之前，多视图几何是一个优化问题——提取特征、匹配、估计本质矩阵、三角化、捆绑调整。VGGT 把它变成一个前向推理问题，而且精度可用。

**它留下的缺口**：
- 多个专用 head，各自 dense 输出，任务之间靠结构隔离；
- 不做动态场景的对应关系——物体一动，追踪就断；
- 解码成本随「帧数 × 分辨率」增长。

这三个缺口，就是下一篇论文的题目。

### CVPR 2026 · D4RT

> *Efficiently Reconstructing Dynamic Scenes One D4RT at a Time*
> Chuhan Zhang, Guillaume Le Moing, … , Andrew Zisserman, Junlin Zhang, Mehdi S. M. Sajjadi
> Google DeepMind · UCL · Oxford · [arXiv:2512.08924](https://arxiv.org/abs/2512.08924)

**它做了什么**：把「回归」换成「寻址」。编码器把整段视频压成一个固定的全局表示 `F`，然后用一个轻量解码器按需回答：

```
q = (u, v, t_src, t_tgt, t_cam) → P ∈ R³
```

**关键跃迁**：任务不再由网络结构定义，而由**查询的扫描方式**定义（论文 Table 1）。

| 任务 | u | v | t_src | t_tgt | t_cam |
|---|---|---|---|---|---|
| 点轨迹 | 固定 | 固定 | 固定 | 1…T | 1…T |
| 点云 | 1…W | 1…H | 1…T | = t_src | 固定 |
| 深度图 | 1…W | 1…H | 1…T | = t_src | = t_src |
| 外参 | 1…h | 1…w | 固定 | 1…T | 1…T |
| 内参 | 1…h | 1…w | 1…T | — | — |

三种「反直觉」但值得记住的设计：

1. **query 之间不做 self-attention**。论文报告这样做会掉点。独立解码让训练只需采样少量 query，推理可任意并行。
2. **9×9 RGB patch 必须拼进查询**。只有归一化坐标，网络不知道你指的是哪个表面。
3. **相机是解出来的，不是预测出来的**。两组对应点 + Umeyama；内参用 `f = pz(u−0.5)/px` 逐点估计后取中位数。

---

## 2. 值得一起读的获奖论文

### CVPR 2025

| 论文 | 奖项 | 一句话 | 为什么值得读 |
|---|---|---|---|
| **VGGT** | 最佳论文 | 前馈几何回归 | 这条线的起点 |
| **Neural Inverse Rendering from Propagating Light** | 最佳学生论文 | 用传播光做神经逆渲染 | 瞬态成像 + 逆渲染的交叉 |
| **MegaSaM** | 荣誉提名 | 模块化 SfM + 测试时优化 | D4RT 的对照面：为什么要统一接口 |
| **Navigation World Models** | 荣誉提名 | 动作条件视频生成 | 「重建」与「预测」的分野 |
| **Molmo & PixMo** | 荣誉提名 | 开放权重 + 开放数据 VLM | 数据工程的方法论 |
| **3D Student Splatting and Scooping** | 荣誉提名 | 3DGS 的可动画改造 | 3DGS 支线的清晰样本 |

### ICCV 2025

| 论文 | 奖项 | 一句话 |
|---|---|---|
| **Generating Physically Stable and Buildable Brick Structures from Text**（BRICKGPT） | 马尔奖（最佳论文） | 把积木生成写成「下一个积木」的自回归建模，推理时做物理有效性检测 + 回滚 |
| **FlowEdit** | 最佳学生论文 | 免反演、免优化、架构无关的文本编辑 |
| **Spatially-Varying Autofocus** | 荣誉提名 | 用 Lohmann 透镜 + 相位 SLM 让每个像素对不同深度对焦 |
| **RayZer** | 最佳学生论文荣誉提名 | 无任何 3D 监督，仅凭 2D 图像自监督学相机与场景 |

### CVPR 2026

| 论文 | 奖项 | 一句话 |
|---|---|---|
| **D4RT** | 最佳论文 | 统一查询接口的 4D 重建 |
| **O-Voxel（Native and Compact Structured Latents for 3D Generation）** | 最佳学生论文 | 兼顾形状与表面属性的紧凑 3D 表示 |
| **NitroGen** | 荣誉提名 | 4 万小时、1000+ 游戏的视觉-动作基础模型 |
| **SAM 3D** | 荣誉提名 | 单图生成带几何、纹理、布局的 3D 物体 |
| **ChordEdit** | 最佳学生论文荣誉提名 | 一步、免训练、免反演的图像编辑 |

来源：[CVPR 2025 获奖页](https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos) ·
[CVPR 2026 获奖公告](https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers) ·
[ICCV 2025 奖项汇总（二手来源）](https://hub.baai.ac.cn/view/49721)

---

## 3. 怎么用这张图

**不要平行读十篇。** 选一条链：

```
VGGT (2025)  →  D4RT (2026)  →  RayZer (自监督对照)  →  MegaSaM (模块化对照)
```

每读一篇，回答三个问题：

1. 它把什么问题**变成**了什么问题？（VGGT：优化 → 回归；D4RT：回归 → 寻址）
2. 它**放弃**了什么？（VGGT 放弃动态对应；D4RT 放弃 query 间显式一致性）
3. 它的假设什么时候**失效**？（分布外尺度、大形变、遮挡、非针孔相机）

能答出第三问，才算读懂。

---

## 4. 为什么这个项目选 D4RT 做锚点

不是因为它最新，而是因为它的核心抽象**可以被操作**。

- VGGT 的核心是「多任务 head 的设计」——只能看，不能玩；
- BRICKGPT 的核心是「序列化 + 回滚」——需要跑模型才能感受；
- D4RT 的核心是一个五元组查询——**五个维度，一个输出，正好做成五个控件**。

再加上它同时是「最新」和「最佳」，教学价值与时效性都在。
