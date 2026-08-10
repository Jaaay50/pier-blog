# Phase 1: 核心动效引擎 ✅

## 已完成的功能

### 1. Lenis 平滑滚动
- ✅ 丝滑的滚动体验（1.2s duration + easeOutExpo）
- ✅ 与 GSAP ScrollTrigger 完美同步
- ✅ 自动管理生命周期

### 2. 自定义光标系统
- ✅ 双层光标（延迟跟随外圈 + 即时跟随内点）
- ✅ 磁性效果（悬停可点击元素时放大）
- ✅ mix-blend-mode 实现跨主题适配
- ✅ 移动端自动禁用

### 3. 性能监控
- ✅ 实时 FPS 计数器
- ✅ 开发环境专属（生产环境自动隐藏）
- ✅ Shift+P 快捷键切换显示
- ✅ 颜色编码性能警示（绿/黄/红）

### 4. GSAP 工具函数库
- ✅ `fadeInUp()` - 淡入上升动画
- ✅ `scrollFadeIn()` - 滚动触发淡入
- ✅ `parallax()` - 视差滚动
- ✅ `magneticEffect()` - 磁性吸附
- ✅ `pinSection()` - 分段钉住
- ✅ `flip()` - FLIP 动画辅助
- ✅ `splitText()` - 文字逐字符动画

### 5. 全局样式增强
- ✅ View Transitions API 支持
- ✅ 液态按钮效果类（.liquid-button）
- ✅ 磁性交互辅助类（.magnetic）
- ✅ GPU 加速优化类（.gpu-accelerate）
- ✅ 粒子轨迹容器预留
- ✅ 自定义光标全局启用（移动端降级）

## 技术栈
- Lenis 3.x - 平滑滚动引擎
- GSAP 3.15 + ScrollTrigger - 动画核心
- View Transitions API - 页面转场
- React 19 + Next.js 15 - 框架支持

## 测试方法
1. 启动开发服务器：`npm run dev`
2. 访问 http://localhost:3000
3. 观察：
   - 光标变为自定义样式（外圈 + 内点）
   - 滚动体验极其丝滑
   - 悬停链接/按钮时光标放大
   - 按 Shift+P 显示 FPS 监控

## 下一步：Phase 2
准备实现页面转场与流体动画：
- 文章卡片到全文的变形飞行
- 导航切换的创意过渡
- 液态按钮与卡片悬停
- 页面滚动分段动画

---
构建时间：约 30 分钟
状态：✅ 已完成并验证

---

# Phase 2: 页面转场与流体动画 ✅

## 已完成的功能

### 1. View Transitions 页面转场
- ✅ TransitionLink 组件（View Transitions API + 修饰键/不支持时降级）
- ✅ Navbar 与首页 CTA 全部接入转场链接
- ✅ BlogCard 点击进入文章页平滑过渡

### 2. 卡片流体动画
- ✅ AnimatedCard：入场淡入上升 + 鼠标 3D 倾斜（elastic 回弹）
- ✅ BlogCard 已包裹 3D 悬停效果

### 3. 液态按钮
- ✅ LiquidButton 组件（鼠标入点液态扩散填充）
- ✅ 首页主 CTA 按钮应用 liquid-button 效果类

### 4. 磁性交互
- ✅ MagneticWrapper 组件（封装 Phase 1 magneticEffect）
- ✅ Navbar Logo 与首页 CTA 磁性吸附

### 5. 滚动动画系统
- ✅ ScrollReveal：ScrollTrigger 驱动的方向性滚动显示（支持 stagger）
- ✅ ScrollProgress：文章页顶部渐变阅读进度条（RAF 节流）
- ✅ 文章页 header 与正文分段进场

## 验证
- `npm run build` 通过（TypeScript 严格检查通过）
- 全路由运行时 200（/ /blog /blog/[slug] /about /showcase）
- 修复：LiquidButton 联合 ref 类型导致的 addEventListener 类型错误

## 下一步：Phase 3
WebGL 视觉系统（3D 粒子星空、Shader 渐变、3D 卡片堆叠）

---

# Phase 3: WebGL 视觉系统 ✅

## 已完成的功能

### 1. WebGL 能力检测与性能降级（`src/lib/webgl/`）
- ✅ `capabilities.ts`：context 探测（结果缓存）+ prefers-reduced-motion + 设备分级（deviceMemory / hardwareConcurrency / pointer 启发式，high/medium/low）
- ✅ 分级输出统一渲染参数：dpr（high 最高 2，其余 1）、particleMultiplier（1 / 0.6 / 0.35）、mouseInteraction（触控设备关闭）
- ✅ `enabled = webglSupported && !reducedMotion && tier !== 'low'`：false 时组件不创建 WebGL context，渲染静态 CSS 降级背景
- ✅ `useWebGLQuality()` hook：SSR 返回 null（兼作水合门），响应 reduced-motion 实时变化
- ✅ `visibility.ts` 渲染门控：IntersectionObserver + visibilitychange，canvas 视口外/标签页隐藏时暂停 RAF，恢复时时间累积不跳变

### 2. 存量 WebGL 组件接入降级与门控
- ✅ Galaxy / Particles / Aurora 全部接入 observeRenderGate（视口外零 GPU 开销）
- ✅ Galaxy 新增 dpr prop；Particles 用 pixelRatio + 粒子数缩放
- ✅ ImmersiveHero / HeroBackground：不可用时渲染 StaticHeroFallback（纯 CSS：深色径向渐变+静态星点 / 浅色暖陶土渐变）
- ✅ SkillsShowcase 卡片内 demo：降级为静态渐变块

### 3. Shader 渐变（新组件）
- ✅ `webgl/ShaderGradient.tsx`：单三角形全屏 simplex 噪声域扭曲流体渐变，三色插值+呼吸高光，自带渲染门控
- ✅ `webgl/FluidBackground.tsx`：主题感知包装（深色蓝紫/浅色暖陶土）+ 完整降级链
- ✅ 接入 /blog 头部（低强度氛围背景）与 /showcase 演示区

### 4. 3D 卡片堆叠（新组件）
- ✅ `webgl/CardStack3D.tsx`：透视堆叠（缩放/下移/变暗），顶层卡点击或拖拽飞出循环，reduced-motion 时简单切换
- ✅ 接入 /showcase Card Interactions 区

### 5. 全局 reduced-motion 体系
- ✅ globals.css：prefers-reduced-motion 时压缩所有过渡/动画时长、恢复默认光标
- ✅ Lenis：reduced-motion 时不接管滚动（保留原生）
- ✅ CustomCursor：reduced-motion 时禁用

### 6. 水合一致性重构
- ✅ ImmersiveHero / SkillsShowcase / HeroBackground / FluidBackground 的 `useEffect(setMounted)` 水合门统一改用 `useWebGLQuality()` 返回值（null = 未挂载），消除 react-hooks/set-state-in-effect 告警

## 降级矩阵
| 条件 | 行为 |
|---|---|
| WebGL context 创建失败 | 静态 CSS 背景，零 canvas |
| prefers-reduced-motion | 静态背景 + 全局动画压缩 + 原生滚动/光标 |
| 低端设备（≤2GB 或 ≤2 核） | 静态背景 |
| 中端设备（触控 / ≤4GB / ≤4 核） | dpr=1，粒子 ×0.6，关闭鼠标交互 |
| canvas 视口外 / 标签页隐藏 | 暂停 RAF，恢复时时间连续 |

## 验证
- `npm run build` 通过（TypeScript 严格检查通过）
- Phase 3 相关文件 ESLint 全部通过（存量 LiquidButton/MDXContent/ScrollProgress/ThemedGradientText/TransitionLink 的旧告警不在本次范围）
- 生产构建运行时全路由 200（/ /blog /blog/[slug] /about /showcase），/showcase 已渲染 ShaderGradient 与 CardStack3D

## 下一步：Phase 4（待定）
候选：存量 lint 告警清理、移动端体验打磨、Lighthouse 性能基线、真机验收

---

# 遗留问题清理 ✅

## 已完成

### 1. ESLint 全部清零（`npx eslint src` 无任何告警/错误）
- ✅ TransitionLink：`[key: string]: any` → 继承 `ComponentProps<typeof Link>`；`(document as any).startViewTransition` → 直接调用（@types/dom-view-transitions 已提供类型）
- ✅ LiquidButton：联合 ref + `as any` → 拆分为 anchorRef/buttonRef 两个独立 ref
- ✅ MDXContent：`(child: any)` → 类型谓词收窄 `child is { type: "text"; value: string }`
- ✅ ScrollProgress：移除未使用的 gsap 导入
- ✅ ThemedGradientText：`useEffect(setMounted)` → `useSyncExternalStore` 水合门（无 setState-in-effect）

### 2. 废弃依赖清理
- ✅ 移除 `@studio-freight/lenis`（代码只导入新包名 `lenis`，package.json / package-lock.json 均已无引用）

## 验证
- `npx eslint src` 全通过（0 error / 0 warning）
- `npm run build` 通过
- 生产构建运行时全路由 200（/ /blog /about /showcase）

## 仍未触及（需真实环境）
- 真机低端设备降级路径实测
- Lighthouse 性能基线
- 移动端体验打磨

---

# Phase 4: 极端微交互 ✅

详见 PHASE4-PLAN.md。核心交付：
- 主题切换圆形扩散（View Transitions + clip-path，从 ThemeToggle 按钮中心，reduced-motion 降级直切）
- RippleProvider 全局涟漪（事件委托 pointerdown，超大区域/data-no-ripple 跳过）+ 按压形变
- TableOfContents 果冻高亮（motion layoutId）+ Lenis.scrollTo 平滑锚点
- Navbar 弹性下划线（layoutId 跨链接滑动）
- SpotlightCard useSpring 弹簧聚光灯
- HorizontalArticles 触控关视差；ProjectsBento 触控 tap 高亮

**Lighthouse 桌面首页基线**（docs/lighthouse/desktop-home.json）：
Performance 97 / A11y 95 / BP 100 / SEO 100；LCP 0.9s / CLS 0.014 / TBT 120ms / TTI 1.0s

提交：`71ce191`，已推送并部署。

---

# Phase 5: 实验性布局 ✅

详见 PHASE5-PLAN.md。核心交付：

### 1. 经历横向滚动叙事（ExperienceJourney）
- 桌面端：sticky 钉住 + 竖向滚动驱动卡片横移（useScroll + useSpring 惯性）
- SVG 波浪路径随滚动进度绘制（motion pathLength）
- 顶部进度指示点（当前卡拉长高亮），背景大字年份装饰
- 降级：移动端 / 触控 / reduced-motion → 传统竖向时间线（whileInView 淡入）
- 接入 /about 替换原 Experience 区块

### 2. Hero 三层视差（FloatingShapes）
- 前景浮动几何层（ring/dot/cross/triangle 六个 SVG 形状）
- 滚动速度快于标题（-220~-340px vs 标题 -120px），制造纵深
- idle 浮动动画错峰；低端设备 / 触控 / reduced-motion 不渲染（quality gate）

### 3. FlipCard 3D 翻转卡片
- 点击翻转 rotateY 180°（preserve-3d + backface-visibility）
- 键盘可达（button + aria-pressed），data-no-ripple 避免涟漪冲突
- reduced-motion 时无旋转直切
- 接入 /showcase Card Interactions 区（正面预览/背面代码片段）

### 未实现（主动裁则）
- Blog 文章页分段钉住：与长文阅读体验冲突，放弃

## 验证
- `npx eslint src` 全通过（0 error / 0 warning）
- `npm run build` 通过
- 生产构建运行时全路由 200；/showcase 渲染 FlipCard，/about 渲染时间线内容

## 下一步：Phase 6
数据可视化（D3.js、Sandpack、雷达图）

---

# Phase 6: 数据可视化 ✅

详见 PHASE6-PLAN.md。核心决策：**零新增依赖**（评估后放弃 D3.js 与 Sandpack，SVG + motion 自绘）。

### 1. SkillRadar 技能雷达图（viz/SkillRadar.tsx）
- 六维雷达（Frontend/Motion/AI/Engineering/Design/Performance）
- 数据多边形从中心弹性展开（spring scale），顶点 stagger 淡入
- hover 顶点显示 tooltip；颜色全走 CSS 变量自动适配双主题
- reduced-motion 无动画直接显示；接入 /about

### 2. BlogStatsFilter tag 条形图 + 过滤（viz/BlogStatsFilter.tsx）
- 按 tag 聚合文章数，横向条形弹性伸长入场（stagger）
- 点击条形客户端过滤文章；AnimatePresence popLayout 平滑重排
- 替换 /blog 原静态列表；传入前裁剪 content 字段（不把全文送到客户端）

### 3. ActivityHeatmap 活动热力图（viz/ActivityHeatmap.tsx）
- GitHub 风格 26 周格子；文章发布日固定最高强度，其余确定性伪随机（同日同值，无水合问题）
- 颜色用 color-mix + --accent 透明度阶梯，双主题自动适配
- hover 显示日期与强度；接入 /about

### 4. i18n
- 新增 about.radarTitle / about.activityTitle / blog.allTag（en/zh）
- About 页改为 async server component（getTranslations + getAllPosts）

### 主动裁则
- Showcase 代码演练场：FlipCard 模式（Phase 5）已覆盖此需求，不引入 Sandpack

## 验证
- `npx eslint src` 全通过；`npm run build` 通过
- 全路由 200；/about 英文渲染 Skill Radar / Writing Activity，中文渲染技能雷达/写作活跃度；/blog tag 聚合数据 SSR 正常

## 下一步：Phase 7
AI 增强（语义搜索、AI 摘要）

---

# Phase 7: AI 增强 ✅

详见 PHASE7-PLAN.md。核心决策：新增唯一依赖 flexsearch（~8KB gzip），拒绝运行时 LLM API（静态零密钥架构）。

### 1. FlexSearch 全文搜索
- `lib/search.ts`：MDX → 纯文本索引数据（去 frontmatter/import/markdown 标记，截 800 字符）
- `/api/search-index`：force-static 双语索引端点（en+zh 共 ~11KB）
- `SearchModal`：⌘K/Ctrl+K 唤起，懒加载 flexsearch + 索引 JSON，
  标题/描述/标签/正文联合搜索，关键词高亮，↑↓+Enter 键盘导航，
  最近搜索（localStorage ×5），无结果兼容热门 tag 兕底
- 接入 Navbar（带 ⌘K 提示按钮）

### 2. 相关文章推荐
- `getRelatedPosts`：tag 交集 ×10 + 日期接近度（同年+2/相邻年+1）打分，最多 3 篇
- 文章页底部「相关阅读」区（至少 1 篇时显示）

### 3. i18n
- 新增 search.*（6 条）与 blog.related（en/zh）

### 主动裁则
- 构建时 AI 摘要：需在 CI 引入 LLM API key（与零密钥架构冲突），
  且现有手写 description 质量已足，收益为负，裁掉
- 向量语义搜索：需运行时 API，同理裁掉；FlexSearch fuzzy 前缀匹配已覆盖实际需求

## 验证
- `npx eslint src` 全通过；`npm run build` 通过（/api/search-index 静态生成）
- 全路由 200；索引端点 en/zh 各 3 篇、总 11KB（目标 <100KB）
- 文章页渲染 Related Reading；Navbar 渲染 ⌘K 搜索按钮

## 下一步：Phase 8
性能优化与打磨（八阶段收官）

---

# Phase 8: 性能优化与打磨 ✅（八阶段收官）

## 性能优化（移动端 74 → 90）

### 1. WebGL 懒加载（ogl 移出首屏主 chunk）
- ImmersiveHero / HeroBackground / SkillsShowcase 中的 Galaxy/Aurora/Particles
  全部改 `next/dynamic` + `ssr: false`（它们本就客户端挂载后才渲染）
- 效果：TBT 390ms → 40ms，FCP 2.4s → 0.9s，bootup 主线程脉冲消失

### 2. LCP 修复（标题 SSR 可见渲染）
- Hero 主标题水合前占位从 `opacity-0` 改为可见文本
- 原问题：LCP 被推迟到 JS 挂载 + 逐字动画完成（移动端 4.5s）
- 效果：LCP 4.5s → 3.6s（剩余成分是字体加载，已有 display:swap）

### 3. Lighthouse 最终基线（docs/lighthouse/）
| | Performance | LCP | TBT | CLS |
|---|---|---|---|---|
| Desktop | **100** | 0.7s | 0ms | ~0.01 |
| Mobile | **90** | 3.6s | 40ms | 0.022 |

## 打磨修缮
- ✅ Footer 年份：硬编码 2024 → `new Date().getFullYear()`（5 处）
- ✅ 文章页/横向画廊日期 locale：硬编码 en-US → 跟随 next-intl locale（zh → zh-CN，实测「2024年3月」）
- ✅ README 重写：create-next-app 模板 → 项目实态（亮点/技术栈/性能表/开发指引）

## 验证
- ESLint 0/0；build 通过；全路由 + /api/search-index 200
- 动态年份渲染 2026；中文日期格式生效

## 八阶段全部完成 🎉
Phase 1 动效引擎 → 2 转场流体 → 3 WebGL → 4 微交互 → 5 实验布局 → 6 数据可视化 → 7 搜索/推荐 → 8 性能收官

待真机验收：移动端交互手感、WebGL 分级参数、主题扩散视觉效果

---

# Phase 9: 视觉技术力升级 ✅（实现完成，真机验收未完）

## 已完成

- ✅ Hero 粒子重组标题：WebGL 粒子采样、碎裂聚合、鼠标斥力、滚动散开、主题配色与完整降级链
- ✅ `/en/lab`、`/zh/lab`：6 个零依赖手写 Demo，双语 SSG 并进入 sitemap
- ✅ Lab 首页引流带、WebGL context 门控与 reduced-motion 静态降级
- ✅ 粒子采样、首帧白字闪现、FluidSim 黑屏等实现问题已修复并上线
- ✅ 原计划的菲涅尔球和 WaveGrid 曾完成，后续按 Phase 10.1 视觉减法决策移除，不再是验收目标

## 仍待真机验收

- 375px 中文/英文换行与 ParticleGate 首帧观感
- Hero 聚合、Lab 六个 Demo 的交互手感与 WebGL context 上限
- Safari 流体模拟、reduced-motion 全链路降级
- Lighthouse 复测与真实设备帧率

详细实现与验收边界见 [PHASE9-PLAN.md](./PHASE9-PLAN.md)。

---

# Phase 10.1–10.9: 视觉减法、签名系统与性能打磨 ✅

- ✅ 视觉减法与中文字体系统
- ✅ accent 降频、卡片点阵、Pier 品牌字标/符号、代码块与阅读进度条
- ✅ Lab 玻璃态最终采用 shader 内折射，移除导致软件光栅化的 SVG reference filter
- ✅ 全站卡片玻璃表面、WebGL DPR/低端 blur 分级与 ambient 呼吸光晕
- ✅ 生产部署完成；Phase 10.9 的真机观感已通过
- ⏳ Phase 10.1 的 Hero、字体、背景强度、技能卡 hover 和分隔线仍与 Phase 9 合并做一次真机验收

---

# Currents 集成状态（2026-08-10）

- ✅ Phase 0–7、批次 2、事件基础、独立事件页、详情 hardening、24h 热度曲线与完整事件 sitemap 已上线
- ✅ 阶段 A：资讯/事件详情页独立反馈入口 + `POST /v1/feedback` 已上线并完成生产验收
- ✅ 阶段 B：五工具只读 MCP Server + Agent Skill 已实现、部署并完成首次生产验收
- ✅ SG2 运维事故已恢复；页面 200、API health 200、MCP 未授权 401 为当前复验基线
- ⏳ 雪、佳、Codex 等具体客户端仍需逐一核验发现、五工具调用、凭据隔离和重启持久性
- ➖ OpenAPI 与公共 REST API 产品化不在当前范围；反馈管理继续使用服务器 CLI
