/* =========================================================================
 * data.js -- all the teaching content lives here, separate from the UI.
 * Facts about awards/papers were checked against the official CVPR/ICCV
 * announcements (links are in `sources`).  Numbers quoted from the paper are
 * marked as such; everything the 3D lab shows is analytic ground truth.
 * ========================================================================= */
window.LAB_DATA = {

  meta: {
    title: 'D4RT · 论文实验室',
    subtitle: '把一篇 CVPR 最佳论文，拆成可以上手的东西',
    version: '1.0',
    builtFor: '想快速读懂 2025–2026 顶会论文的新手与从业者'
  },

  /* ------------------------------------------------------------- papers  */
  papers: [
    {
      id: 'd4rt', venue: 'CVPR 2026', year: 2026, award: '最佳论文', awardKind: 'best',
      title: 'Efficiently Reconstructing Dynamic Scenes One D4RT at a Time',
      authors: 'Chuhan Zhang, Guillaume Le Moing, Skanda Koppula, Ignacio Rocco, Liliane Momeni, Junyu Xie, Shuyang Sun, Rahul Sukthankar, Joëlle K. Barral, Raia Hadsell, Zoubin Ghahramani, Andrew Zisserman, Junlin Zhang, Mehdi S. M. Sajjadi',
      org: 'Google DeepMind · UCL · Oxford',
      one: '用统一的 Transformer 一次前向解出深度、时空对应和完整相机参数；核心是一个 (u,v,t_src,t_tgt,t_cam) → 3D 点的查询接口。',
      why: '它把"4D 重建"从一堆专用模块收敛成一个接口。读懂这个接口，2025–2026 一整条"前馈几何"路线就通了。',
      learn: ['按需查询如何替代逐帧密集解码', '为什么 query 之间反而不能互相注意', '相机参数如何由点"解"出来而不是"猜"出来'],
      tags: ['anchor', 'feed-forward', '4D', 'query'],
      links: [
        { l: 'arXiv 2512.08924', u: 'https://arxiv.org/abs/2512.08924' },
        { l: 'CVPR 2026 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers' },
        { l: '项目主页', u: 'https://d4rt-paper.github.io/' }
      ]
    },
    {
      id: 'vggt', venue: 'CVPR 2025', year: 2025, award: '最佳论文', awardKind: 'best',
      title: 'VGGT: Visual Geometry Grounded Transformer',
      authors: 'Jianyuan Wang, Minghao Chen, Nikita Karaev, Andrea Vedaldi, Christian Rupprecht, David Novotny',
      org: 'Oxford VGG · Meta AI',
      one: '读入 1–N 张图，一次前向直接回归相机参数、深度图、点图和点追踪。',
      why: 'D4RT 的直接前身。它证明了"几何可以被 Transformer 直接回归"，但留下了多个专用 head 与动态场景的缺口——这正是 D4RT 的出发点。',
      learn: ['交替注意力如何同时建模帧内与跨帧关系', '多任务 head 的耦合代价', '点图（point map）这种表示为什么好用'],
      tags: ['feed-forward', 'geometry', 'multi-view'],
      links: [
        { l: 'arXiv 2503.11651', u: 'https://arxiv.org/abs/2503.11651' },
        { l: 'CVPR 2025 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos' }
      ]
    },
    {
      id: 'megasam', venue: 'CVPR 2025', year: 2025, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: 'MegaSaM: Accurate, Fast and Robust Structure and Motion from Casual Dynamic Videos',
      authors: 'Zhengqi Li, Richard Tucker, Forrester Cole 等（Google Research）',
      org: 'Google Research',
      one: '把多个现成模型拼成一套"随手拍动态视频"的 SfM 流水线，用测试时优化保证几何一致。',
      why: 'D4RT 论文开篇的对照对象：模块化 + test-time optimization 的典型代价。读它能明白"为什么要统一接口"。',
      learn: ['传统 SfM 流水线的模块边界在哪', '测试时优化换来了什么、付出了什么'],
      tags: ['SfM', 'dynamic', 'optimization'],
      links: [{ l: 'CVPR 2025 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos' }]
    },
    {
      id: 'nwm', venue: 'CVPR 2025', year: 2025, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: 'Navigation World Models',
      authors: 'Amir Bar, Gaoyue Zhou, Danny Tran, Trevor Darrell, Yann LeCun',
      org: 'UC Berkeley · Meta',
      one: '把"导航"建模成条件视频生成：给定动作，预测世界的下一帧。',
      why: '与几何重建互补的另一条线——用生成模型做"世界模型"。对比阅读能看清"重建"与"预测"的分野。',
      learn: ['动作条件视频生成如何评估', '世界模型与 3D 重建的关系'],
      tags: ['world model', 'video', 'planning'],
      links: [{ l: 'CVPR 2025 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos' }]
    },
    {
      id: 'molmo', venue: 'CVPR 2025', year: 2025, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: 'Molmo and PixMo: Open Weights and Open Data for State-of-the-Art Vision-Language Models',
      authors: 'Matt Deitke, Christopher Clark 等（Allen AI 等）',
      org: 'Allen Institute for AI 等',
      one: '开放权重 + 开放数据的 VLM，证明"数据质量"可以硬撼闭源模型。',
      why: '如果你的增量想做"论文讲解助手"，这是必读的对照：多模态模型能读到什么程度、数据从哪来。',
      learn: ['高质量人工标注数据的构建流程', '开源 VLM 的训练配方'],
      tags: ['VLM', 'open data'],
      links: [{ l: 'CVPR 2025 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos' }]
    },
    {
      id: 'splatting', venue: 'CVPR 2025', year: 2025, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: '3D Student Splatting and Scooping',
      authors: 'Jialin Zhu, Jiangbei Yue, Feixiang He, He Wang',
      org: 'University of Leeds 等',
      one: '把 3D Gaussian Splatting 改造成"学生-教师"式的密度建模，用于可动画的人体/物体重建。',
      why: '想理解 3DGS 这一支的演进，这是一篇结构清晰、方法不复杂的样本。',
      learn: ['3DGS 的密度表示如何被改造', 'splat 与 scoop 的物理直觉'],
      tags: ['3DGS', 'avatar'],
      links: [{ l: 'CVPR 2025 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos' }]
    },
    {
      id: 'brickgpt', venue: 'ICCV 2025', year: 2025, award: '马尔奖（最佳论文）', awardKind: 'best',
      title: 'Generating Physically Stable and Buildable Brick Structures from Text',
      authors: 'Kangle Deng, Ruixuan Liu, Changliu Liu, Jun-Yan Zhu 等',
      org: 'CMU',
      one: 'BRICKGPT：把积木结构生成写成"下一个积木"的自回归语言建模，并用物理有效性检测 + 回滚保证可搭建。',
      why: '2025 年最优雅的"把结构化约束塞进自回归解码"的范例。做任何"生成 + 约束"的系统都值得借鉴。',
      learn: ['如何把 3D 结构序列化成 token', '推理时的有效性检测与回滚机制', '数据集 StableText2Brick 的构建'],
      tags: ['generation', 'LLM', '3D'],
      links: [
        { l: 'ICCV 2025 奖项报道', u: 'https://hub.baai.ac.cn/view/49721' },
        { l: 'ICCV 2025 论文集', u: 'https://openaccess.thecvf.com/ICCV2025' }
      ]
    },
    {
      id: 'flowedit', venue: 'ICCV 2025', year: 2025, award: '最佳学生论文', awardKind: 'student',
      title: 'FlowEdit: Inversion-Free Text-Based Editing Using Pre-Trained Flow Models',
      authors: '（ICCV 2025 最佳学生论文）',
      org: '—',
      one: '不反演、不优化、与架构无关：直接在源/目标两个分布之间构造 ODE 做文本编辑。',
      why: '"绕过反演"这个思路非常通用。如果你要做图像/视频编辑，这是 2025 年最值得抄的骨架。',
      learn: ['为什么反演会引入误差', '如何在 flow 模型上构造直接传输'],
      tags: ['diffusion', 'editing', 'flow'],
      links: [{ l: 'ICCV 2025 奖项报道', u: 'https://hub.baai.ac.cn/view/49721' }]
    },
    {
      id: 'rayzer', venue: 'ICCV 2025', year: 2025, award: '最佳学生论文荣誉提名', awardKind: 'hm',
      title: 'RayZer: A Self-supervised Large View Synthesis Model',
      authors: 'Hanwen Jiang 等',
      org: 'UT Austin 等',
      one: '无任何 3D 监督（无相机位姿、无几何），仅凭 2D 图像自监督学会相机与场景表示。',
      why: '与 D4RT 形成有趣对照：一个靠几何真值监督，一个靠渲染自监督。两条路线的取舍值得写进笔记。',
      learn: ['射线结构作为唯一 3D 先验', '相机表示与场景表示的解耦'],
      tags: ['novel view', 'self-supervised'],
      links: [{ l: 'ICCV 2025 论文页', u: 'https://openaccess.thecvf.com/content/ICCV2025/html/Jiang_RayZer_A_Self-supervised_Large_View_Synthesis_Model_ICCV_2025_paper.html' }]
    },
    {
      id: 'autofocus', venue: 'ICCV 2025', year: 2025, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: 'Spatially-Varying Autofocus',
      authors: '（CMU 团队）',
      org: 'CMU',
      one: '用 Lohmann 透镜 + 相位型空间光调制器，让每个像素对焦在不同深度，光学上直接得到全焦图像。',
      why: '硬核的计算成像。提醒你：视觉不只有神经网络，光学本身也是"算法"。',
      learn: ['空间可变 PSF 的设计', '对比度 + 视差线索估计深度'],
      tags: ['computational imaging', 'optics'],
      links: [{ l: 'ICCV 2025 奖项报道', u: 'https://hub.baai.ac.cn/view/49721' }]
    },
    {
      id: 'ovoxel', venue: 'CVPR 2026', year: 2026, award: '最佳学生论文', awardKind: 'student',
      title: 'Native and Compact Structured Latents for 3D Generation（O-Voxel）',
      authors: 'Jianfeng Xiang, Xiaoxue Chen, Sicheng Xu 等',
      org: '清华 · 微软研究院 · 中科大 · Microsoft AI',
      one: 'O-Voxel：一种能同时表达复杂形状与表面属性的紧凑 3D 表示，显著提升生成资产的质量。',
      why: '和 D4RT 同届获奖，代表另一条主线：3D 生成中的"表示设计"。想做 3D 应用必读。',
      learn: ['3D  latent 的紧凑性与表达力如何权衡', '表面属性（材质）如何与几何联合建模'],
      tags: ['3D generation', 'representation'],
      links: [{ l: 'CVPR 2026 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers' }]
    },
    {
      id: 'sam3d', venue: 'CVPR 2026', year: 2026, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: 'SAM 3D: 3Dfy Anything in Images',
      authors: 'Xingyu Chen, Fu-Jen Chu, Pierre Gleize 等',
      org: 'Meta Superintelligence Labs',
      one: '从单张图生成带几何、纹理与布局的 3D 物体，在人类偏好测试中取得 5:1 以上的胜率。',
      why: '"单图转 3D"的产品化临界点。适合作为你增量系统的下游能力。',
      learn: ['单图 3D 的数据与评估方式', '人类偏好评估怎么设计'],
      tags: ['3D generation', 'single image'],
      links: [{ l: 'CVPR 2026 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers' }]
    },
    {
      id: 'nitrogen', venue: 'CVPR 2026', year: 2026, award: '最佳论文荣誉提名', awardKind: 'hm',
      title: 'NitroGen: An Open Foundation Model for Generalist Gaming Agents',
      authors: 'Loïc Magne, Anas Awadalla 等',
      org: 'NVIDIA · Stanford · Caltech 等',
      one: '用 4 万小时、1000+ 游戏的玩法视频训练视觉-动作基础模型。',
      why: '"视频即动作监督"的规模化实验。做 agent / 具身方向可以看它的数据配方。',
      learn: ['大规模 gameplay 数据如何转成动作标签', '跨游戏泛化的评估'],
      tags: ['agent', 'video', 'foundation model'],
      links: [{ l: 'CVPR 2026 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers' }]
    },
    {
      id: 'chordedit', venue: 'CVPR 2026', year: 2026, award: '最佳学生论文荣誉提名', awardKind: 'hm',
      title: 'ChordEdit: One-Step Low-Energy Transport for Image Editing',
      authors: 'Liangsi Lu, Xuhang Chen 等',
      org: '广东工业大学 · 惠州学院 · 深圳大学 · 北京大学',
      one: '模型无关、免训练、免反演的一步图像编辑，把"实时编辑"变成现实。',
      why: '与 FlowEdit 同一思想脉络的 2026 版本。适合观察一个 idea 如何被迭代打磨。',
      learn: ['低能量传输的直觉', '一步编辑如何保持保真度'],
      tags: ['editing', 'one-step'],
      links: [{ l: 'CVPR 2026 获奖公告', u: 'https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers' }]
    }
  ],

  sources: [
    { l: 'CVPR 2025 最佳论文与最佳 Demo（官方）', u: 'https://cvpr.thecvf.com/Conferences/2025/BestPapersDemos' },
    { l: 'CVPR 2026 最佳论文公告（官方，2026-06-09）', u: 'https://cvpr.thecvf.com/Conferences/2026/News/Best_Papers' },
    { l: 'ICCV 2025 奖项汇总（二手来源，中文）', u: 'https://hub.baai.ac.cn/view/49721' },
    { l: 'D4RT 论文（arXiv:2512.08924）', u: 'https://arxiv.org/abs/2512.08924' }
  ],

  compare: {
    head: ['维度', 'VGGT（CVPR 2025）', 'D4RT（CVPR 2026）'],
    rows: [
      ['输入', '1–N 张图像（无序）', '一段视频（有序，带时间）'],
      ['输出方式', '多个专用 head 各自 dense 输出', '单一查询接口，按需解码任意点'],
      ['相机参数', '专用 head 直接回归', '由解码点做 Umeyama / 中位数求解'],
      ['动态场景', '不建模对应关系', '原生支持：查询可跨时间取点'],
      ['计算成本', '随 帧数 × 分辨率 增长', '随 查询数 增长（可稀疏可稠密）'],
      ['解码器', '任务特定、较重', '轻量、独立 query、可并行'],
      ['核心抽象', '几何回归', '几何寻址（geometry as a queryable field）']
    ]
  },

  /* ------------------------------------------------------------ anatomy  */
  anatomy: [
    {
      id: 'problem', kicker: '01 · 问题', short: '问题', title: '逐帧密集解码，把成本花在了你不需要的地方',
      essence: '4D 重建被拆成一堆专用模块：单目深度、度量深度、运动分割、相机估计……每个都 dense 输出，再靠 test-time optimization 拼起来。',
      why: [
        '论文开篇引用的 MegaSaM 是典型：多个现成模型 + 昂贵的测试时优化，只为了让不同模块"自洽"。',
        'VGGT 虽然是前馈的，但仍然用多个专用 decoder 分别输出相机、深度、点图；解码成本随"帧数 × 像素数"增长。',
        '更关键的是：这些方法拿不到动态部分的对应关系（dynamic correspondence），而真实视频里物体一直在动。'
      ],
      pitfall: '"dense 输出更准"是直觉陷阱。dense 只是把计算前置；如果下游只需要 500 个点，多算的 99% 是浪费，而且这些点之间并没有被显式约束成一致。',
      where: '§1 Introduction（对照 MegaSaM / VGGT / SpatialTrackerV2）',
      formula: null, code: null
    },
    {
      id: 'encoder', kicker: '02 · 编码', short: '编码器', title: '整段视频先压成一个固定的全局表示',
      essence: 'F = E(V) ∈ R^{N×C}：编码器把整段视频变成一张"可被寻址的几何记忆"，之后全程不再更新。',
      why: [
        '结构沿用 VGGT：ViT + 交替的"帧内局部注意力"与"跨帧全局注意力"。局部层保住细节、控制成本；全局层建立跨帧对应。',
        '输入统一 resize 成方形以支持任意长宽比，长宽比本身作为一个额外 token 送入 transformer。',
        'F 一旦算完就固定：所有查询都只读它。这让"编码一次、查询无数次"成为可能，也是训练/推理高效的前提。'
      ],
      pitfall: '别把 encoder 当成"特征提取器"。跨帧对应主要在这里建立，decoder 极轻——它只负责"取数"。这也是为什么 query 之间不需要互相通信。',
      where: '§2.2 Model Architecture · Encoder',
      formula: 'F = E(V),  V ∈ R^{T×H×W×3}  →  F ∈ R^{N×C}',
      code: `F = E(V)   # 交替：frame-wise local  <->  global self-attention
           # 输出后冻结，不再随查询变化`
    },
    {
      id: 'query', kicker: '03 · 查询', short: '查询构造', title: '把"我要什么"编码成一个五元组',
      essence: 'q = (u, v, t_src, t_tgt, t_cam)。三个时间索引各管一件事，缺一不可。',
      why: [
        't_src 决定"看哪条光线/哪个像素"；t_tgt 决定"要哪个时刻的几何"；t_cam 决定"用哪台相机的坐标系表达结果"。',
        '坐标 (u,v) 用 Fourier feature 编码；三个时间索引用可学习的离散 embedding。',
        '关键细节：查询还拼接了以 (u,v) 为中心的 9×9 RGB patch 的 embedding。消融显示去掉它性能显著下降——网络需要"局部外观上下文"才能知道这个坐标落在哪个物体表面上。'
      ],
      pitfall: '不要以为 t_tgt 和 t_cam 可以合并。合并后你无法表达"取第 5 帧的几何、但用第 1 帧的相机坐标表示"——而这正是做点云与外参所必需的。',
      where: '§2.1 D4RT Framework · §2.2 Pointwise decoder',
      formula: 'q = (u, v, t_src, t_tgt, t_cam)\n→ φ_uv(u,v) ⊕ e(t_src) ⊕ e(t_tgt) ⊕ e(t_cam) ⊕ Patch_{9×9}(u,v,t_src)',
      code: `q = [fourier(u, v),
     emb_tsrc[t_src], emb_ttgt[t_tgt], emb_tcam[t_cam],
     patch_encoder(V[t_src, patch9x9(u, v)])]
P = decoder(q, F)          # P in R^3`
    },
    {
      id: 'decoder', kicker: '04 · 解码', short: '解码器', title: '每个查询独立解码，查询之间不通信',
      essence: 'P = D(q, F) ∈ R³。每个 query 单独 cross-attend 到 F，query 之间没有 self-attention。',
      why: [
        '论文明确报告：早期实验里让 query 之间做 self-attention，性能明显下降。',
        '独立解码带来三个好处：训练时只需采样少量 query 就有监督信号；推理时可任意并行、任意稀疏或稠密；没有顺序依赖（不是 RNN 式逐帧递推）。',
        '这才是"高效"的真正来源：成本 ∝ 查询数，而不是 帧数 × 分辨率。'
      ],
      pitfall: '"独立解码会不会不自洽？" 一致性由 encoder 的全局表示保证，decoder 是无状态读取器。把一致性放在表示层而不是解码层，是这个设计的核心取舍。',
      where: '§2.2 Pointwise decoder',
      formula: 'P = D(q, F) ∈ R³    （所有 q 相互独立，可 map-reduce）',
      code: `for q in queries:            # 批内完全并行
    P[q] = decoder(q, F)     # 只读 F，不读别的 query`
    },
    {
      id: 'train', kicker: '05 · 训练', short: '监督', title: '监督信号只落在被采样的查询上',
      essence: '每个 batch 随机采样 N 个 query，对它们解出的 3D 点算 L1 损失。',
      why: [
        '不需要 dense 的深度图或点图真值，只需要"某个像素在某个时刻的三维位置"——数据要求因此大幅降低。',
        '训练成本与解码点数解耦：采 N 个 query 就只算 N 个点。',
        '多种监督被统一成同一个 L1：轨迹、深度、点云、相机，最终都化归为"点坐标要准"。'
      ],
      pitfall: '稀疏监督不等于弱监督。关键是采样分布要覆盖动态区域、遮挡边界和不同的时间跨度——否则模型在"难样本"上会系统性失效。',
      where: '§2.3 Training and Inference',
      formula: 'L = (1/N) Σ_i  ‖ P̂(q_i) − P(q_i) ‖₁',
      code: `qs = sample_queries(batch=N)
loss = (pred(qs) - gt(qs)).abs().mean()
loss.backward()`
    },
    {
      id: 'unify', kicker: '06 · 统一', short: '任务统一', title: '换一种扫描方式，就换了一个任务',
      essence: '所有 4D 任务都是同一个接口的不同"查询模式"——任务不再由网络结构定义，而由查询的扫描方式定义。',
      why: [
        '固定 (u,v) 扫 t_tgt → 点轨迹；扫全部像素 → 点云；只取 P 的 z → 深度图。',
        '外参不是"预测"出来的，而是求解出来的：同一组源点在两个参考系各解码一次，得到两组对应的 3D 点，用 Umeyama/SVD 求刚体变换。',
        '内参同理：假设主点在 (0.5, 0.5)，由 fx = pz(u−0.5)/px 逐点估计，再取中位数抗噪。'
      ],
      pitfall: '很多人以为相机是"另一个 head"。这里相机是几何后处理：模型只出点，相机由点算出来。这解释了为什么它能做到"单一接口、统一精度"。',
      where: '§2.1 · Table 1',
      formula: 'fx = pz·(u−0.5)/px ,  fy = pz·(v−0.5)/py\nf̂ = median_k(f_k)',
      code: `# extrinsics: two decodings, one SVD
A = [decode(u,v,i,i,i) for (u,v) in grid]
B = [decode(u,v,i,i,j) for (u,v) in grid]
R, t = umeyama(B, A)        # i <- j`
    },
    {
      id: 'dense', kicker: '07 · 稠密化与边界', short: '稠密与边界', title: '用"占位网格"渐进覆盖，而不是一次解码所有像素',
      essence: '算法 1：采样未访问的源点 → 查询它的整条轨迹 → 把轨迹上可见的像素标记为已访问 → 重复，直到全覆盖。',
      why: [
        '一条轨迹同时贡献了几十帧的信息，所以总查询数远小于 帧数 × 像素数。',
        '这就是"稀疏查询得到稠密结果"的具体做法：用覆盖度而不是分辨率来驱动采样。',
        '局限同样清晰：依赖训练分布与尺度；大形变、遮挡、拓扑变化仍难；query 独立意味着没有显式一致性约束；相机模型假设 pinhole，鱼眼等需要额外 refinement。'
      ],
      pitfall: '"统一接口"不等于"统一精度"。Table 1 里每个任务的最优查询密度与网格大小都是工程折中——论文对内外参只查粗网格，就是为了速度。',
      where: '§2.3 Algorithm 1 · §5 Conclusion',
      formula: null,
      code: `G = zeros(T, H, W)                 # occupancy
while not G.all():
    B = sample_unvisited(G)
    for (u, v, t_src) in B:
        P = [decode(u, v, t_src, k, k) for k in 1..T]
        G[visible(P)] = True`
    }
  ],

  /* -------------------------------------------------------------- modes  */
  modes: {
    track: {
      name: '点轨迹', badge: 'Point Track', row: '表 1 第 1 行',
      desc: '固定源点与源帧，只让目标时刻扫过整段视频，得到一条 3D 轨迹。注意轨迹不是一条直线——物体会动，相机也在动。',
      queries: 'T = 8 次查询 / 条轨迹',
      formula: 'P_k = D(u, v, t_src, k, t_src)',
      note: '为便于观察，这里把参考相机固定在 t_src。论文的稠密追踪算法取 t_cam = t_tgt，相当于每帧在各自相机系下表达轨迹。'
    },
    cloud: {
      name: '点云', badge: 'Point Cloud', row: '表 1 第 2 行',
      desc: '扫过源帧的所有像素，全部解码到同一个参考相机系。注意：这里没有任何坐标变换，点云是"直接在参考系里解码"出来的。',
      queries: 'W×H ≈ 2.8 万次查询',
      formula: 'P = D(u, v, t, t, t_cam)  for all (u,v)',
      note: '画面上按 1/6 采样渲染，计数按完整分辨率计算。'
    },
    depth: {
      name: '深度图', badge: 'Depth Map', row: '表 1 第 3 行',
      desc: '同样的扫描，但只保留 P 的 z 分量。深度图不是独立任务，它只是点云的一个投影。',
      queries: 'W×H ≈ 2.8 万次查询',
      formula: 'depth(u,v) = D(u, v, t, t, t)_z',
      note: '颜色越暖越远。深度值就是相机系下的 z，不含任何后处理。'
    },
    pose: {
      name: '相机', badge: 'Extrinsics / Intrinsics', row: '表 1 第 4、5 行',
      desc: '在 h×w 粗网格上采样源点，在两个参考系各解码一次，再用 Umeyama 求刚体变换；内参由 pz(u−0.5)/px 逐点估计后取中位数。',
      queries: '2×h×w 次查询 → 一次 SVD',
      formula: 'R, t = Umeyama(B, A)   |   fx = median(pz(u−0.5)/px)',
      note: '本例是解析真值，误差在 1e-2 度量级（采样点跨越数十米深度，数值条件不佳）。换成真实网络输出，这套流程就是论文恢复相机的方法——误差将体现网络精度。'
    }
  },

  /* --------------------------------------------------------- flashcards  */
  cards: [
    { id: 'c01', q: 'D4RT 的一次查询由哪五个量组成？', a: '(u, v, t_src, t_tgt, t_cam)：源像素坐标、源时刻、目标时刻、参考相机时刻。解码结果是该点在 t_cam 相机系下、t_tgt 时刻的 3D 位置。', ref: '§2.1' },
    { id: 'c02', q: '为什么三个时间索引不能合并成两个？', a: 't_src 决定看哪条光线，t_tgt 决定要哪个时刻的几何，t_cam 决定用哪个坐标系表达。合并 t_tgt 与 t_cam 后，"取第 5 帧几何、用第 1 帧坐标表示"就无法表达，点云和外参都做不了。', ref: '§2.1' },
    { id: 'c03', q: 'Global Scene Representation F 是什么？', a: '编码器输出的固定 latent，F ∈ R^{N×C}。整段视频被压进它，之后不再更新；所有查询都只读它。', ref: '§2.1' },
    { id: 'c04', q: '编码器的注意力结构是什么？', a: 'ViT 主干，交替使用"帧内局部注意力"和"跨帧全局自注意力"（沿用 VGGT）。局部层保细节控成本，全局层建立跨帧对应。', ref: '§2.2' },
    { id: 'c05', q: '查询里的 9×9 RGB patch 有什么用？', a: '提供局部外观上下文。只有归一化坐标时网络不知道这个点落在哪个物体表面；patch embedding 显著提升精度（消融中移除会明显掉点）。', ref: '§2.2 / §4.4' },
    { id: 'c06', q: 'decoder 中 query 之间为什么不做 self-attention？', a: '论文报告早期实验里这样做会明显掉点。独立解码让训练只需少量 query、推理可任意并行与稀疏/稠密，且无顺序依赖。', ref: '§2.2' },
    { id: 'c07', q: '一致性由谁保证？', a: '由 encoder 的全局表示保证。decoder 是无状态读取器；把一致性放在表示层而不是解码层，是这个设计的核心取舍。', ref: '§2.2 / §4.4' },
    { id: 'c08', q: '训练监督信号是什么？', a: '对 batch 内采样的 N 个 query 的 3D 点做 L1 损失。不需要 dense 的深度/点图真值。', ref: '§2.3' },
    { id: 'c09', q: '为什么训练和推理都快？', a: '成本正比于查询数，而不是 帧数×分辨率。训练只采样少量 query；推理可以只查需要的点。', ref: '§2.3 / §4' },
    { id: 'c10', q: '怎么得到某一帧的深度图？', a: '取 t_src = t_tgt = t_cam = 该帧，扫过所有像素，只保留 P 的 z 分量。深度图是点云的副产品。', ref: 'Table 1' },
    { id: 'c11', q: '点云为什么不需要坐标变换？', a: '因为 t_cam 可以固定为参考帧，直接把每个像素解码到同一参考相机系里。省掉了"用可能不准的相机估计做变换"这一步。', ref: '§2.1' },
    { id: 'c12', q: '相对位姿怎么得到？', a: '在粗网格上采样源点，在参考系 i 和 j 各解码一次，得到两组对应的 3D 点，用 Umeyama/SVD 求刚体变换。不是网络直接回归的。', ref: '§2.1' },
    { id: 'c13', q: '内参公式是什么？为什么取中位数？', a: 'fx = pz(u−0.5)/px，fy 同理（主点假设在 0.5,0.5）。逐点估计会受遮挡/边缘影响，中位数抗离群。', ref: '§2.1' },
    { id: 'c14', q: '稠密追踪算法怎么覆盖全视频？', a: '维护 occupancy grid；采样未访问源点，查询整条轨迹，把轨迹上可见像素标记为已访问；重复直到全覆盖。', ref: '§2.3 Algo. 1' },
    { id: 'c15', q: 'D4RT 与 VGGT 最本质的差别？', a: 'VGGT 用多个专用 head 各自 dense 输出；D4RT 用单一查询接口按需解码，并且原生支持动态场景的对应关系。', ref: '§1' },
    { id: 'c16', q: 'D4RT 名字的含义？', a: 'Dynamic 4D Reconstruction Transformer——面向动态场景的四维重建 Transformer。', ref: '标题' },
    { id: 'c17', q: '论文承认的主要局限有哪些？', a: '依赖训练分布与尺度；大形变/遮挡/拓扑变化困难；query 独立导致没有显式一致性约束；针孔相机假设，畸变需额外 refinement。', ref: '§5' },
    { id: 'c18', q: '为什么"任务"不再由网络结构定义？', a: '因为所有任务都是同一接口的不同扫描方式（Table 1 的笛卡尔积）。换扫描方式就换任务，不需要换 head、换损失、换模型。', ref: 'Table 1' },
    { id: 'c19', q: '这一范式最像传统图形学里的什么？', a: '光栅化 vs 光线追踪：前者把所有几何一次性铺到屏幕上，后者按需采样。D4RT 把"按需"带进了 4D 重建。', ref: '类比（非原文）' },
    { id: 'c20', q: '论文附录专门讨论了什么扩展？', a: '长视频的泛化（Appendix B: Generalization to Long Videos），以及亚像素精度的高分辨率解码（Appendix C）。', ref: '附录 B / C' }
  ],

  /* --------------------------------------------------------------- quiz  */
  quiz: [
    {
      id: 'q1', q: '关于 decoder 中 query 的处理，哪一项是论文的实际做法？',
      options: ['所有 query 先互相 self-attention，再 cross-attend',
                '每个 query 独立 cross-attend 到 F，query 之间不交互',
                '用 RNN 按时间顺序逐帧解码',
                '先解码低分辨率，再逐级上采样'],
      answer: 1,
      explain: '论文明确报告：早期实验里让 query 之间做 self-attention 会明显掉点。独立解码使训练只需采样少量 query，推理可任意并行。',
      ref: '§2.2'
    },
    {
      id: 'q2', q: '要得到第 3 帧的深度图，查询应如何设置？',
      options: ['t_src=3, t_tgt=0, t_cam=0', 't_src=3, t_tgt=3, t_cam=3',
                't_src=0, t_tgt=3, t_cam=3', '需要额外的深度 head'],
      answer: 1,
      explain: '三者相等时，P 就是该帧相机系下的三维点，取其 z 即深度。深度图不是独立任务。',
      ref: 'Table 1'
    },
    {
      id: 'q3', q: '内参估计为什么对多个采样点的结果取中位数？',
      options: ['为了让运算可微', '单点估计会被遮挡/边缘带偏，中位数对离群值更鲁棒',
                '中位数算得更快', '论文没有给出理由'],
      answer: 1,
      explain: '每个采样点独立给出一个焦距估计，误差分布有重尾；中位数抗离群，是标准的鲁棒统计做法。',
      ref: '§2.1'
    },
    {
      id: 'q4', q: '查询中拼接 9×9 RGB patch embedding 的主要作用是？',
      options: ['提供局部外观上下文，帮助锁定具体物体表面', '替代 Fourier 坐标编码',
                '用于图像超分辨率', '纯粹为了增加参数量'],
      answer: 0,
      explain: '仅有归一化坐标时，网络不知道这个点落在哪个表面；消融显示移除 patch 会显著掉点。',
      ref: '§2.2 / §4.4'
    },
    {
      id: 'q5', q: '与 VGGT 相比，D4RT 的核心变化是？',
      options: ['用卷积替换了 Transformer', '用统一查询接口取代了多个专用 decoder',
                '只支持静态场景', '依赖测试时优化'],
      answer: 1,
      explain: 'VGGT 为不同任务设专用 decoder；D4RT 用单一接口按需解码，并原生处理动态场景。',
      ref: '§1'
    },
    {
      id: 'q6', q: '训练时只采样少量 query 为什么仍然有效？',
      options: ['因为 GT 本来就是稠密的，采样只是加速', '因为损失只定义在 query 上，成本与查询数成正比、与像素数无关',
                '因为模型参数量小', '因为用了知识蒸馏'],
      answer: 1,
      explain: '监督信号就是被采样 query 的 3D 点坐标，因此不需要 dense GT，训练成本与解码点数解耦。',
      ref: '§2.3'
    },
    {
      id: 'q7', q: '算法 1 中 occupancy grid 的作用是？',
      options: ['存储深度图', '记录哪些像素已被某条轨迹覆盖，避免重复查询',
                '加速编码器推理', '存储相机位姿'],
      answer: 1,
      explain: '用"已访问"标记把查询预算花在未覆盖区域，从而用远少于 帧数×像素数 的查询覆盖全视频。',
      ref: '§2.3 Algo. 1'
    },
    {
      id: 'q8', q: 't_cam 单独存在的意义是什么？',
      options: ['兼容多相机设备', '把"几何内容"与"表达坐标系"解耦，使同一查询可在任意参考系取值',
                '用于时间戳对齐', '没有实际作用'],
      answer: 1,
      explain: '正因如此，点云可以直接在参考系里解码，省掉用（可能不准的）相机估计做坐标变换。',
      ref: '§2.1'
    },
    {
      id: 'q9', q: '编码器为什么交替使用"帧内局部"与"跨帧全局"注意力？',
      options: ['为了减少参数量', '局部层保细节控成本，全局层建立跨帧对应',
                '为了支持视频超分', '因为显存不够'],
      answer: 1,
      explain: '这是沿用 VGGT 的设计：局部注意力处理高分辨率细节，全局注意力负责跨帧关联。',
      ref: '§2.2'
    },
    {
      id: 'q10', q: '以下哪一项说法是【错误】的？',
      options: ['每个 query 独立解码，因此可以任意并行',
                '点云可以直接在参考相机系解码，无需显式坐标变换',
                '外参由模型的一个专用 head 直接回归得到',
                '深度图可由点查询的 z 分量得到'],
      answer: 2,
      explain: '外参是求解出来的：两组对应 3D 点 + Umeyama/SVD。模型只输出点，相机由点算出来。',
      ref: '§2.1'
    },
    {
      id: 'q11', q: '"统一接口"最准确的含义是？',
      options: ['所有任务共享同一套网络权重和同一个损失',
                '所有任务都是同一查询接口的不同扫描方式，任务由查询模式而非网络结构定义',
                '所有任务输出同一种张量形状',
                '所有数据集合并成一个训练'],
      answer: 1,
      explain: 'Table 1 的笛卡尔积：换扫描方式就换任务。这正是它能用单一 decoder 覆盖多任务的原因。',
      ref: 'Table 1'
    },
    {
      id: 'q12', q: '以下哪项【不属于】论文承认的局限？',
      options: ['依赖训练数据的分布与尺度', '大形变、遮挡、拓扑变化仍然困难',
                '必须为每个任务单独训练一个模型', '采用针孔相机假设，畸变需额外 refinement'],
      answer: 2,
      explain: '"一个模型覆盖多任务"正是它的贡献；其余三项都在结论/局限中被明确提到。',
      ref: '§5'
    }
  ],

  /* ------------------------------------------------------------- socratic */
  socratic: [
    {
      id: 's1',
      prompt: '如果把 D4RT 部署到手机端的实时 SLAM 里，你会先改哪一部分？为什么？',
      hint: '从成本结构入手：encoder 是一次性的大头，decoder 随查询数增长。想想哪些查询是"必须先有"的。',
      rubric: ['指出 encoder 是固定成本、查询是可变成本', '给出具体的查询预算策略（如关键帧 + 稀疏追踪）', '提到精度与延迟的取舍点']
    },
    {
      id: 's2',
      prompt: '为什么"把一致性放在表示层，而不是解码层"是一个好设计？请举一个反例说明反过来会怎样。',
      hint: '反例可以是：multi-view stereo 里逐像素独立预测深度，再靠后处理做一致性；或 VGGT 的多 head 之间需要额外对齐。',
      rubric: ['说明 encoder 承担了跨帧对应', '指出解码层的无状态性带来的并行收益', '举出"独立预测 + 后处理对齐"的具体代价']
    },
    {
      id: 's3',
      prompt: '假设每个视频你只能监督 100 个 query，你会怎么采样？请给出一个可执行的策略。',
      hint: '考虑：动态区域优先、遮挡边界、时间跨度、难度课程（curriculum）。',
      rubric: ['采样分布覆盖动态区域', '考虑时间跨度而非只采相邻帧', '有可验证的评估方式（如按区域分层统计误差）']
    },
    {
      id: 's4',
      prompt: '用一句话向外行解释这个"查询接口"，不许用"数据库"或"查表"的类比。',
      hint: '试试"给一段视频装一个坐标系统，你可以问它：这个像素上的那个点，在第 3 秒时跑到哪了？"',
      rubric: ['点明"像素 + 时刻 → 三维位置"', '体现时空解耦', '句子可被非专业读者理解']
    }
  ],

  /* ---------------------------------------------------------------- path */
  path: [
    {
      day: 1, title: '先建坐标系', goal: '把相机模型、点图、内外参这三件事彻底弄清楚，否则后面全是符号。',
      actions: ['读 VGGT 摘要 + 方法总图（30 分钟，不求甚解）', '手推一遍 X_cam = R(X−C) 与像素投影', '在"查询矩阵"里随便点几个像素，观察 P 的数值'],
      deliverable: '一页笔记：画出相机、光线、3D 点三者的关系',
      check: '能不看资料写出投影公式，并解释为什么深度是 z 而不是光线长度'
    },
    {
      day: 2, title: '精读 Method', goal: '把五元组查询和"独立解码"这两个反直觉设计吃透。',
      actions: ['读 §2.1–2.2，逐段对照"架构解剖"的 01–04 步', '在查询矩阵里把 t_src / t_tgt / t_cam 分别拨动，观察点怎么动', '用一句话写下"为什么 query 之间不能互相注意"'],
      deliverable: '三句话总结：接口是什么、为什么这样设计、代价是什么',
      check: '能不看论文说出三个时间索引各自的职责，并各举一个任务'
    },
    {
      day: 3, title: '实验与消融', goal: '知道每个设计决策"值多少分"，建立对论文可信度的判断。',
      actions: ['读 Table 1 与主要结果表，标出每个任务的查询模式', '读消融：9×9 patch、query 独立性、编码器预训练', '记录 3 个"如果去掉会怎样"的结论'],
      deliverable: '一张"设计 → 收益 → 代价"对照表',
      check: '能解释为什么"独立解码"反而比"让 query 互相注意"更好'
    },
    {
      day: 4, title: '亲手实现接口', goal: '把公式变成能跑的东西，这是从"读懂"到"会用"的分水岭。',
      actions: ['运行 lab/verify.py，看 11 项几何自检', '修改 lab/scene.py 里的相机路径或物体运动，重新导出', '用 20 行代码实现自己的 query()，与 golden 对齐'],
      deliverable: '一份可运行的查询实现 + 一张自己场景的 3D 截图',
      check: '你的实现与浏览器里的结果一致（误差 < 1e-6）'
    },
    {
      day: 5, title: '批判与延伸', goal: '形成自己的判断，而不是复述论文。',
      actions: ['写 300 字 review：贡献、假设、局限、可改进点', '提出一个可验证的改进（例如：查询采样策略 / 稀疏注意力）', '把这篇论文加进"论文库"模板，写下它与 VGGT 的关系'],
      deliverable: '300 字 review + 1 个改进假设',
      check: '能指出 2 个真实局限，并说明如何用实验验证你的改进'
    }
  ],

  readingTips: [
    { t: '三遍读法', b: '第一遍 5 分钟：只读标题、摘要、图 1、结论，回答"它解决什么问题"。第二遍 30 分钟：读方法与实验图表，回答"怎么做的、好在哪"。第三遍 2 小时：抠公式、看附录、追引用，回答"假设是否成立、边界在哪"。' },
    { t: '先读图和表', b: '顶会论文的信息密度在图表里。先看懂 Figure 2（方法总图）和 Table 1（任务/设置），正文只是图注的展开。看不懂图再回去读文字，效率高得多。' },
    { t: '把公式翻译成代码', b: '任何一个公式，试着写成 3–5 行伪代码。写不出来，说明你没真懂；写出来后发现维度对不上，说明论文有隐藏假设。这一步能筛掉 80% 的"假懂"。' },
    { t: '建立符号表', b: '每篇论文开头先列一张表：符号 → 含义 → 维度。跨论文阅读时，同一个符号常常含义不同（比如 t 在 D4RT 里是时刻，在别处是平移）。' },
    { t: '追一条引用链', b: '不要平行读十篇。选一篇锚点论文，向上追 2 篇（它基于谁）、向下追 2 篇（谁改进了它）。一条链读透，胜过十篇泛读。VGGT → D4RT 就是一条完美的链。' },
    { t: '写"反例笔记"', b: '每读完一篇，写一条"这个方法什么时候会失效"。能构造出反例，说明你理解了假设；只会复述优点，说明你还在背。' }
  ]
};
