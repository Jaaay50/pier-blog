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

Deployed on Vercel via GitHub Actions (`.github/workflows/deploy.yml`).
