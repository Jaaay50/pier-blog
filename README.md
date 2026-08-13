# Pier Blog

Personal blog & portfolio — exploring the intersection of AI, interaction design, and modern web engineering.

**Live**: [ethanpier.com](https://ethanpier.com)

## Highlights

- **双模式设计系统** — 深色（Kimi 深空科技蓝）/ 浅色（Claude 暖纸张陶土），全站 CSS 变量驱动
- **WebGL 视觉系统** — Galaxy 星空 / Aurora 极光 / 流体 Shader 渐变，带完整设备分级与性能降级
- **动效工程** — Lenis 平滑滚动 + GSAP ScrollTrigger + motion，View Transitions 页面转场与主题圆形扩散
- **实验性布局** — 横向滚动叙事时间线、三层视差、SVG 路径动画、3D 翻转卡片
- **数据可视化** — 零依赖 SVG 雷达图 / tag 条形图过滤 / 活动热力图
- **全文搜索** — FlexSearch 客户端索引（⌘K），统一发现博客、Currents 功能页、主题与模型详情，支持关键词高亮、键盘导航与相关文章推荐
- **双语内容** — next-intl（en/zh）+ MDX 双语文章 + 双语 RSS
- **潮汐 · Currents** — `/currents` AI 前沿资讯聚合：独立后端（[`currents-backend`](https://github.com/Jaaay50/currents-backend)，私有）每日 3 次采集 19 个信源，经 LLM 双语摘要、评分与深度解读后入库；提供精选/全部/论文视图、今日要闻、搜索、收藏、日报、热点榜、主题地图、原文翻译与独立事件页。`/currents/models` 模型榜聚合 6 个独立公开评测来源，维护 47 个正式模型与 3 个 Preview 模型，提供综合/编程/Agent/推理/性价比五类榜单，并将能力、可信度和厂商官方价格分离呈现；每个模型均有双语详情页、来源分项与公开方法页。阶段 A 已上线双语「报告内容问题」入口；阶段 B 已交付五工具只读 MCP Server + Agent Skill；阶段 C 已上线统一产品外壳、`/currents/agent`、`/feedback` 与多类型全站搜索。API 与 MCP 分别经 `currents-api.ethanpier.com`、`currents-mcp.ethanpier.com/mcp` 提供；更新日志位于 `/currents/changelog`
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

## Project Log

Phase 1–8 已收官；Phase 9 与 Phase 10.1–10.9 已实现并部署；Phase 11A、11B P1、11D P1 与 11E P1 已完成生产闭环，Phase 11C P1 为有保留通过。当前剩余项包括 Hero/Lab/Safari/reduced-motion/Lighthouse 真机验收、服务器安全审计及 CSP nonce/hash 与 Trusted Types 增强。完整记录见 [PROGRESS.md](./PROGRESS.md)，安全阶段见 [PHASE11-SECURITY-PLAN.md](./PHASE11-SECURITY-PLAN.md)。

Currents（潮汐）模块技术方案与分阶段实施记录见 `/Users/ethan/pi-space/projects/currents-tides-aggregator.md` 与 `/Users/ethan/pi-space/projects/currents/`（本机）。阶段 A 详情页「报告内容问题」入口、阶段 B MCP Server + Agent Skill（服务端）、阶段 C 产品闭环与潮汐模型榜均已上线；模型榜通过独立方法页、详情页、统一搜索和 sitemap 进入发现链路。模型榜前端 PR #18 合并于 commit `7e6617f`，main CI `31717663112` 与 production deploy `31717796886` 成功，Vercel deployment `pier-blog-hb837ksgd-jia-ethans-projects.vercel.app` Ready 并 alias 到 `ethanpier.com`。注意区分：页面与数据服务上线不等于所有 Agent 客户端已接入；模型榜现有 Review 还保留历史曲线分区、请求超时及英文事实展示三个非阻断修正项，详见 [PROGRESS.md](./PROGRESS.md)。

同日（2026-08-11）Agent 接入页与 AI 日报页排版优化已通过 commits `8319969` / `0fd04b5` 部署到生产：Agent 页采用「主文档栏 + 右侧粘性目录/快速接入栏」双栏与四阶段接入说明，代码块和示例提问提供可访问的复制成功/失败反馈；日报页采用 1020px 左锚定宽版单栏、分类锚点导航和统一编辑列表。验证：112/112 tests、TypeScript、production build、`git diff --check` 通过；Actions run `31468832109` success，production deployment `pier-blog-e5gt0npjh-jia-ethans-projects.vercel.app` Ready，`ethanpier.com` 中英文 Agent 页与中文日报均完成线上技术验收。

下一安全阶段：服务器 SSH、防火墙、更新、备份恢复与运行权限审计；CSP nonce/hash 与 Trusted Types 继续作为独立增强项。

Deployed on Vercel via GitHub Actions (`.github/workflows/deploy.yml`).
