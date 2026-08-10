# Pier Blog

Personal blog & portfolio — exploring the intersection of AI, interaction design, and modern web engineering.

**Live**: [ethanpier.com](https://ethanpier.com)

## Highlights

- **双模式设计系统** — 深色（Kimi 深空科技蓝）/ 浅色（Claude 暖纸张陶土），全站 CSS 变量驱动
- **WebGL 视觉系统** — Galaxy 星空 / Aurora 极光 / 流体 Shader 渐变，带完整设备分级与性能降级
- **动效工程** — Lenis 平滑滚动 + GSAP ScrollTrigger + motion，View Transitions 页面转场与主题圆形扩散
- **实验性布局** — 横向滚动叙事时间线、三层视差、SVG 路径动画、3D 翻转卡片
- **数据可视化** — 零依赖 SVG 雷达图 / tag 条形图过滤 / 活动热力图
- **全文搜索** — FlexSearch 客户端索引（⌘K），关键词高亮 + 键盘导航 + 相关文章推荐
- **双语内容** — next-intl（en/zh）+ MDX 双语文章 + 双语 RSS
- **潮汐 · Currents** — `/currents` AI 前沿资讯聚合：独立后端（[`currents-backend`](https://github.com/Jaaay50/currents-backend)，私有）每日 3 次采集 19 个信源，经 LLM 双语摘要、评分与深度解读后入库；提供精选/全部/论文视图、今日要闻、搜索、收藏、日报、热点榜、主题地图、原文翻译与独立事件页。事件页按时间线区分官方/媒体/社区/聚合，支持 merge 308、split 独立身份与真实 24h/3h 热度曲线。阶段 A 已在资讯/事件详情页上线双语反馈入口及后端防滥用写入契约；阶段 B 已交付五工具只读 MCP Server + Agent Skill（热点、搜索、资讯、事件、日报）。API 与 MCP 分别经 `currents-api.ethanpier.com`、`currents-mcp.ethanpier.com/mcp` 提供；更新日志位于 `/currents/changelog`
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

```bash
npm install
npm run dev        # 开发（3000 被占用时 --port 3002）
npm run build      # 生产构建
npm run lint       # ESLint
```

文章写在 `src/content/blog/*.{en,zh}.mdx`，frontmatter 需要 `title` / `date` / `description` / `tags`。

## Project Log

Phase 1–8 已收官；Phase 9 与 Phase 10.1–10.9 已实现并部署，当前剩余项主要是 Hero/Lab/Safari/reduced-motion/Lighthouse 真机验收。完整记录见 [PROGRESS.md](./PROGRESS.md)，各阶段规划见 `PHASE*-PLAN.md`。

Currents（潮汐）模块技术方案与分阶段实施记录见 `/Users/ethan/pi-space/projects/currents-tides-aggregator.md` 与 `/Users/ethan/pi-space/projects/currents/`（本机）。截至 2026-08-10，阶段 A 独立反馈页与阶段 B MCP Server + Agent Skill 均已上线并完成首次生产验收；具体客户端仍需逐一核验接入与重启持久性。

Deployed on Vercel via GitHub Actions (`.github/workflows/deploy.yml`).
