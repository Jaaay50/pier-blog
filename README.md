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
- **潮汐 · Currents** — `/currents` AI 前沿资讯聚合：独立后端（[`currents-backend`](https://github.com/Jaaay50/currents-backend)，私有）每日 3 次采集 arXiv / HuggingFace / HN / 官方博客与科技媒体（19 信源），经 LLM 双语摘要、评分与深度解读后入库；前端 SSG 静态壳 + 客户端数据岛（精选/全部/论文三视图 / 今日要闻 / 紧凑时间线 / 来源与评分过滤 / 全文搜索 / 本地收藏 / 已读弱化 / 三档列表密度），详情页 `/currents/[id]` 与潮汐日报 `/currents/daily[/date]` 为 ISR（真实 canonical/hreflang/OG/NewsArticle JSON-LD），API 经 Cloudflare Tunnel 提供（`currents-api.ethanpier.com`）。批次 2（2026-08-06）新增：热点榜 `/currents/hot`（48h 多信源事件，空时回退 7 天）、主题地图 `/currents/topics` + 主题详情 `/currents/topics/[topicId]`（复用时间线与分页）、详情页「原文翻译 / AI 导读 / 深度解读」三档 Tab（全文翻译由后端管线产出）
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

八阶段进化计划全程记录在 [PROGRESS.md](./PROGRESS.md)，各阶段规划见 `PHASE*-PLAN.md`。

Currents（潮汐）模块技术方案与分阶段实施记录见 `/Users/ethan/pi-space/projects/currents-tides-aggregator.md` 与 `/Users/ethan/pi-space/projects/currents/`（本机）。2026-08-05 上线。

Deployed on Vercel via GitHub Actions (`.github/workflows/deploy.yml`).
