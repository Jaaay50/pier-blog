# Pier Blog

Personal blog & portfolio — exploring the intersection of AI, interaction design, and modern web engineering.

**Live**: [ethanpier.com](https://ethanpier.com)

## Highlights

- **双模式设计系统** — 深色（Kimi 深空科技蓝）/ 浅色（Claude 暖纸张陶土），全站 CSS 变量驱动
- **WebGL 视觉系统** — Galaxy 星空 / Aurora 极光 / 流体 Shader 渐变，带完整设备分级与性能降级
- **动效工程** — Lenis 平滑滚动 + GSAP ScrollTrigger + motion，View Transitions 页面转场与主题圆形扩散
- **响应式布局系统** — 1440px shell / 1280px content / 760px reading column；超宽屏结构内容扩至 1440px，移动端保持安全边距与局部横向滚动
- **实验性布局** — 横向滚动叙事时间线、三层视差、SVG 路径动画、3D 翻转卡片
- **数据可视化** — 零依赖 SVG 雷达图 / tag chip 过滤 / 活动热力图
- **全文搜索** — FlexSearch 客户端索引（⌘K），关键词高亮 + 键盘导航 + 相关文章推荐
- **双语内容** — next-intl（en/zh）+ MDX 双语文章 + 双语 RSS
- **潮汐 · Currents** — `/currents` AI 前沿资讯聚合：独立后端（[`currents-backend`](https://github.com/Jaaay50/currents-backend)，私有）每日 3 次采集 19 个信源，经 LLM 双语摘要、评分与深度解读后入库；提供精选/全部/论文视图、今日要闻、搜索、收藏、日报、热点榜、模型榜（`/currents/models`：综合/编程/Agent/推理/性价比五类榜单 + 模型详情 + 评分方法页）、主题地图、原文翻译与独立事件页。事件页按时间线区分官方/媒体/社区/聚合，支持 merge 308、split 独立身份与真实 24h/3h 热度曲线。阶段 A 已在资讯/事件详情页上线双语「报告内容问题」入口及后端防滥用写入契约；阶段 B 已交付五工具只读 MCP Server + Agent Skill（热点、搜索、资讯、事件、日报）。阶段 C：统一 Currents 产品外壳（宽屏左侧导航 + 紧凑产品导航）、`/currents/agent` Agent 接入页（受邀开放、只读、中英双语）、`/feedback` 全局产品反馈页与多类型全站搜索。API 与 MCP 分别经 `currents-api.ethanpier.com`、`currents-mcp.ethanpier.com/mcp` 提供；更新日志位于 `/currents/changelog`
- **可访问性** — prefers-reduced-motion 全链路降级（静态背景 / 原生滚动 / 无动画直切）

## Tech Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · motion · GSAP · Lenis · ogl · FlexSearch · MDX (shiki + rehype-pretty-code)

## Performance

Lighthouse（本地生产构建，见 `docs/lighthouse/`）：

| | Performance | LCP | TBT | CLS |
|---|---|---|---|---|
| Desktop | 100 | 0.7s | 0ms | ~0.01 |
| Mobile | 90 | 3.6s | 40ms | 0.022 |

关键优化：WebGL 组件 `next/dynamic` 懒加载（ogl 不进首屏主 chunk）、Hero 标题 SSR 可见渲染（LCP 不等动画）、视口外 canvas 暂停 RAF、设备分级（dpr / 粒子数 / 交互开关）。

## Development

Requires Node.js `22.23.1` and npm `10.9.8` (see `.nvmrc`, `.node-version`, and `packageManager`).

```bash
npm ci
npm run dev        # 开发（3000 被占用时 --port 3002）
npm test           # Vitest
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript
npm run build      # 生产构建
```

文章写在 `src/content/blog/*.{en,zh}.mdx`，frontmatter 需要 `title` / `date` / `description` / `tags`。

## Identity Discovery

`https://ethanpier.com/.well-known/webfinger` provides the fixed JRD used to discover the Auth0 issuer for the `ethanpier.com` Tailscale OIDC tailnet. The endpoint is public, cacheable for five minutes, CORS-readable, and marked `X-Robots-Tag: noindex`; it contains no client credentials.

When changing the OIDC provider or administrator email, update `src/app/.well-known/webfinger/route.ts` and its colocated test together. The issuer must exactly match the provider's `/.well-known/openid-configuration` value. Client IDs, client secrets, passwords, and tokens remain outside this repository. See [docs/tailscale-oidc.md](./docs/tailscale-oidc.md) for the contract, verification, and rollback procedure.

## Project Log

Phase 1–8 已收官；Phase 9 与 Phase 10.1–10.9 已实现并部署；Phase 11A、11B P1、11D P1 与 11E P1 已完成生产闭环，Phase 11C P1 为有保留通过；2026-08-13 潮汐模型榜（PR #18）上线；2026-08-17 Tailscale OIDC WebFinger discovery 上线；2026-08-21 全站响应式布局系统（PR #24）上线。本地最新验证基线（Node 22.23.1 / npm 10.9.8）：37 个测试文件、279 项测试、audit、lint、TypeScript 与 51 页 production build 通过；PR/main `validate` 和 production deploy 成功，正式站在 390/768/1440/2560px 下完成关键页面技术验收。当前剩余项包括新 Tailnet 首台设备接入、Hero/Lab/Safari/reduced-motion/Lighthouse 真机验收、服务器安全审计及 CSP nonce/hash 与 Trusted Types 增强。完整记录见 [PROGRESS.md](./PROGRESS.md)，安全阶段见 [PHASE11-SECURITY-PLAN.md](./PHASE11-SECURITY-PLAN.md)。

Currents（潮汐）模块技术方案与分阶段实施记录见 `/Users/ethan/pi-space/projects/currents-tides-aggregator.md` 与 `/Users/ethan/pi-space/projects/currents/`（本机）。截至 2026-08-11：阶段 A 详情页「报告内容问题」入口、阶段 B MCP Server + Agent Skill（服务端）、阶段 C 产品闭环（Currents 统一产品外壳、`/currents/agent` Agent 接入页、`/feedback` 全局反馈页、统一全站搜索）均已上线并完成生产验收；同日完成 Currents 响应式与动效统一修复（PR #3、merge commit `5361594`、生产部署 `pier-blog-9eixpss8u`）：外壳扩至 1760px 自适应编辑工作台，移动端改为「潮汐 · 当前页」文字产品导航 + 底部筛选面板，浅色表面统一暖纸语义层级，已读态改为局部标记（不再整卡降 opacity），今日要闻改为主故事 + 2×2 次要卡，内部导航恢复 TransitionLink/View Transitions。Review 后续修正已通过 commit `ff5beef` 与 Actions run `31459121708` 部署：侧栏改为 ≥1536px 显示，1280–1535px 渐进预留侧栏空间，日期标题取消白色渐变与吸顶层，并补齐导航、筛选面板和卡片状态问题；同日的 Agent/日报排版工作已完成多视口浏览器验收（见下）。注意区分：服务端部署 ≠ 客户端真实接入——具体客户端仍需逐一核验工具发现、五工具调用、凭据隔离与重启持久性。

同日（2026-08-11）Agent 接入页与 AI 日报页排版优化已通过 commits `8319969` / `0fd04b5` 部署到生产：Agent 页采用「主文档栏 + 右侧粘性目录/快速接入栏」双栏与四阶段接入说明，代码块和示例提问提供可访问的复制成功/失败反馈；日报页采用 1020px 左锚定宽版单栏、分类锚点导航和统一编辑列表。验证：112/112 tests、TypeScript、production build、`git diff --check` 通过；Actions run `31468832109` success，production deployment `pier-blog-e5gt0npjh-jia-ethans-projects.vercel.app` Ready，`ethanpier.com` 中英文 Agent 页与中文日报均完成线上技术验收。

下一安全阶段：服务器 SSH、防火墙、更新、备份恢复与运行权限审计；CSP nonce/hash 与 Trusted Types 继续作为独立增强项。

Deployed on Vercel via GitHub Actions (`.github/workflows/deploy.yml`).
