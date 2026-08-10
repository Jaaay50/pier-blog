# Phase 9: 视觉技术力升级 — 高优先级批次

> 实现状态（2026-08-10）：核心代码已完成并部署；菲涅尔球与 WaveGrid 在后续 Phase 10.1 中按视觉减法决策移除。剩余工作仅为真机、Safari、reduced-motion、Lighthouse 与主观观感验收，不代表功能尚未实现。

**核心定位**：让访客打开首页 10 秒内，仅凭外观就判断出「作者技术力很强」。三个工作流：Hero 粒子重组标题（第一印象）、Lab 实验室（技术深度证明）、前景 Shader 元素（精致感）。

**最高指导原则**：所有效果必须是亲手写的底层实现（GLSL / Canvas / 算法自绘），不引任何新依赖——「零依赖」本身就是技术力展示的一部分。公开 "view source" 入口已按后续产品决策移除，但实现文件与 README 仍需能证明技术路径。

## 依赖决策

| 候选 | 结论 | 理由 |
|---|---|---|
| three.js | ❌ 不引入 | ogl 已 vendored 且够用；three 体积 10 倍于 ogl |
| matter.js / rapier（物理引擎） | ❌ 不引入 | Verlet 积分 + 空间哈希自写约 250 行，本身是展示品 |
| WebGL-Fluid-Simulation（现成库） | ❌ 不引入 | 流体求解器必须自写（Navier-Stokes ping-pong FBO），这是 Lab 的旗舰 demo |
| d3 | ❌ 维持已有裁决 | 算法可视化用 SVG + motion 自绘 |
| **新增 npm 依赖** | **无** | 全部基于既有栈：ogl / motion / GSAP / Canvas 2D / 原生 WebGL2 |

## 9.1 Hero 粒子重组标题（ParticleTextHero）

**概念**：数千粒子从混沌星尘状态物理聚合成标题文字；成形后有呼吸漂移与鼠标斥力；滚动时粒子散开回归混沌。深色主题下与 Galaxy 星空呼应（「星尘聚字」），浅色主题下是陶土色光尘。

### 视觉时间线

1. **首帧（SSR）**：DOM 真实标题直接可见（LCP 硬约束，不可 opacity-0）
2. **就绪后（字体 loaded + WebGL ready + 采样完成，约 0.5-1s）**：canvas 淡入呈现混沌粒子，DOM 标题同步快速淡出（0.25s）
3. **聚合（约 1.4s）**：粒子带 per-particle stagger 聚合成文字形状，ease [0.22,1,0.36,1]
4. **待机**：微呼吸漂移 + 轻微 twinkle + 鼠标斥力（推开后平滑回位）
5. **滚动**：scrollY 0→400 映射聚合度 1→0，粒子散开（替代现有标题上浮淡出的视差）

### 技术实现

- **采样管线**：offscreen Canvas 2D 以实际渲染字号（读取 DOM 标题 computed style，含 font-family/size/letter-spacing）绘制文字 → `getImageData` 按自适应步长采样 alpha>128 像素 → 目标位置数组。步长 = `sqrt(文字像素数 / 目标粒子数)` 自动求得
- **换行复刻**：英文按词、中文按字测量宽度，超出容器宽度时在 offscreen canvas 手动换行，与 DOM 折行一致
- **渲染**：ogl `gl.POINTS` 单 mesh；attributes：`aStart`（混沌位）/ `aTarget`(文字位) / `aRandom`(seed)；vertex shader 内 `mix(chaos(t), target + breathe(t), easedProgress)`，progress 带 per-particle 偏移
- **鼠标斥力**：无状态 GPU 方案（同 Galaxy 的 repulsion 数学：`normalize(pos-mouse) * strength / (dist+eps)`），配合 lerp 的 `uMouseActiveFactor` 平滑进出
- **配色**：粒子按目标 x 位置在 shader 内三色渐变，uniform 取自 `--gradient-text-1/2/3`；主题切换只更新 3 个 uniform，不重采样
- **粒子数**：high tier 目标约 9000-12000（采样自动逼近），`particleMultiplier` 缩放；深色加法混合发光感，浅色 alpha 混合
- **字体门控**：`document.fonts.load()` 等待 display 字体，3s 超时兜底（超时则维持 DOM 标题字母动效，不启动粒子）
- **resize**：防抖重采样；**locale**：标题文本变化即重采样
- **背景层**：Galaxy/Aurora 保留但透明度调低（0.7→0.45），让粒子文字成为主角；FloatingShapes 保留

### 降级矩阵

| 条件 | 行为 |
|---|---|
| SSR / JS 未就绪 | DOM 标题静态可见（现状保留） |
| `prefers-reduced-motion` | DOM 标题静态显示，无字母动效、无粒子 |
| WebGL 不可用 / low tier | 保留现有逐字上浮+去模糊动效（现有代码即降级路径，不删除） |
| medium tier / coarse pointer | 粒子数 ×0.6、dpr 1、无鼠标斥力，聚合动画保留 |
| 视口外 / 标签页隐藏 | `observeRenderGate` 暂停 RAF（既有机制） |

### 架构约束遵守

- `next/dynamic` 懒加载（ogl 不进主 chunk）
- `<h1>` + `sr-only` 全文保留，canvas 层 `aria-hidden`
- 不在 `<h1>` 内渲染块级元素
- 主题无关、中英文动效一致（单一组件单一管线）

## 9.2 Lab 实验室（/lab 页 + 首页引流区）

**概念**：新增 `/[locale]/lab` 页面，6 个亲手写的可交互技术 demo；首页在 Bento 与文章画廊之间插入一条可交互引流带。每个 demo 卡片带 "view source" 链接指向 GitHub 对应文件——证明全部手写。

### 页面结构

- 路由：`src/app/[locale]/lab/page.tsx`，SSG（`generateStaticParams` 覆盖双 locale），Navbar 增加入口
- 命名（沿用海港主题，最终由橋定夺）：zh 「船塢」/ en "Lab"，副标题说明「全部零依赖手写」
- 布局：旗舰 demo（流体）占首行全宽，其余 2 列网格；移动端单列
- 每卡结构：标题 + 一行说明 + 技术 chips（如 `WebGL2 · GLSL · 0 deps`）+ 交互区 + view source
- SEO：sitemap 增补、OG 图、i18n 文案（en/zh）

### 六个 Demo（按实现顺序）

| # | Demo | 技术 | 交互 | 约行数 |
|---|---|---|---|---|
| 1 | **流体模拟**（旗舰） | WebGL2 ping-pong FBO 自写 Navier-Stokes：advection → vorticity confinement → divergence → Jacobi 压力迭代 ×20 → gradient subtract；染料按主题色 | 鼠标/触摸拖拽注入速度与染料 | ~500 |
| 2 | **物理沙盒** | Canvas 2D 自写 Verlet 积分 + 空间哈希碰撞 + 约束链（悬挂绳） | 点击生成小球、拖拽投掷、重力开关 | ~250 |
| 3 | **流场粒子** | Canvas 2D，value noise 的 curl 构造无散度流场，2500 粒子长拖尾 | 鼠标吸引/排斥切换 | ~200 |
| 4 | **3D 形变** | ogl POINTS 参数曲面（球 ↔ 环面结 ↔ 立方 ↔ 波面）per-point stagger morph | 拖拽旋转、点击切换形态、自动轮播 | ~250 |
| 5 | **Shader 画布** | WebGL fbm 噪声流动艺术 | 滑杆实时调 hue / 流速 / 湍流层数 / 缩放 + randomize | ~200 |
| 6 | **排序可视化** | SVG + motion，冒泡/插入/归并/快排 | 选算法、播放/暂停、速度、重洗 | ~250 |

### 性能与上下文管理（硬约束）

- **WebGL context 并发上限 2**：demo 容器进入视口才创建 context（IntersectionObserver 挂载，不只是暂停），离开视口一定距离销毁（`loseContext`，复用 Galaxy 清理模式）
- 全部 demo `next/dynamic` 仅在 /lab 加载，不进首页与文章页 chunk
- 流体模拟分级：sim 网格 high 256 / medium 128，渲染分辨率 dpr 1；WebGL2 或 float 纹理不可用 → 静态渐变 + 文字说明降级
- Canvas 2D demos（物理/流场）medium tier 减半粒子/小球数
- reduced-motion：全部 demo 显示静态预览帧 + 「已按系统偏好停用动效」说明

### 首页引流带

- 位置：ProjectsBento 之后、HorizontalArticles 之前
- 形态：约 40vh 全宽交互带，内嵌低分辨率流体模拟（sim 网格 96，进一步降级为静态渐变），鼠标划过即出效果
- 文案：「这些效果全部零依赖手写」+ CTA 进入 /lab
- 该带与 Hero 粒子共存时依赖 render gate 保证同屏活跃 context ≤2

## 9.3 前景 Shader 元素（从背景到可感知对象）

克制原则：全站只加 2 个前景元素，避免视觉噪音。

1. **菲涅尔渐变球**（Stripe 质感）：ogl 球体 + fresnel 边缘光 + 主题三色渐变环境色；悬浮于 Skills 区标题旁；鼠标接近时被弹簧推开（`useSpring`），缓慢自转；`pointer-events: none`，从 window mousemove 计算 proximity；深色蓝紫玻璃感 / 浅色陶土玻璃感
2. **波动网格分隔带**：ogl LINES 3D 网格，滚动驱动波浪相位，置于文章画廊与 footer 之间作为分隔；替代纯空白留白

两者均走 quality gate + render gate + reduced-motion 静态降级，`next/dynamic` 懒加载。

## 验收标准

- [x] Hero：SSR 标题、粒子采样/聚合、鼠标斥力、滚动散开、待机呼吸、主题 uniform 更新与降级代码已实现并完成构建/生产部署
- [ ] Hero 真机：中英文均正确成形（含 375px 换行）、ParticleGate 无白字闪现，Lighthouse LCP 不劣化于既有基线
- [ ] Hero 真机：WebGL 不可用、low tier、medium tier、reduced-motion、视口外/后台暂停路径逐条验证
- [x] Lab：6 个 Demo 已实现；“查看源码”入口按后续产品决策移除，不再作为验收项
- [x] Lab：`/en/lab` 与 `/zh/lab` 已构建为 SSG 并进入 sitemap
- [ ] Lab 真机：六个 Demo 交互正常，同屏活跃 WebGL context ≤2，移动端单列可用
- [ ] 流体模拟在 Safari（WebGL2）实测可用，float 纹理不可用时降级正确
- [x] 前景球与波动网格曾完成，后续按 Phase 10.1 视觉减法决策删除，不再作为当前验收目标
- [x] 全站：Phase 9 交付时 `npm run build` 与 ESLint 通过，页面保持静态生成
- [ ] 全站真机：桌面帧率、移动端 medium tier、reduced-motion 静态呈现与 Phase 10.1 视觉观感联合验收

## 实现顺序

1. **9.1 Hero 粒子重组**（第一印象，最高优先）
2. **9.2 Lab**：流体（旗舰）→ 物理沙盒 → 流场 → 3D 形变 → Shader 画布 → 排序 → 首页引流带 → nav/i18n/SEO
3. **9.3 前景元素**：菲涅尔球 → 波动网格
4. 收尾：README Highlights 与 PROGRESS 已同步；Lighthouse 复测、Safari/reduced-motion 和真机验收仍待完成

---

**说明**：中优先级批次（微交互升级 / 项目卡动态预览 / 代码块增强）在本阶段完成后另立 Phase 10 计划。
