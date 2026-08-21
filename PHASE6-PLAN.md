# Phase 6: 数据可视化

> 实现状态（2026-08-21）：本阶段已完成并部署；本文保留历史规划口径，BlogStats 的最终界面已演进为可换行 tag chip，最终交付、依赖裁则与验证结果见 `PROGRESS.md` 的 Phase 6 记录。

**核心定位**：用交互式数据图形替代静态文字描述，让技能与文章数据「活」起来。

## 依赖决策（务实评估）

原规划候选 D3.js + Sandpack，评估后调整：

| 候选 | 结论 | 理由 |
|---|---|---|
| D3.js 全量 | ❌ 不引入 | ~250KB，本站图表规模用 SVG + motion 自绘即可，已有 motion 依赖 |
| Sandpack | ❌ 不引入 | 运行时依赖 CodeSandbox bundler 外部服务，与静态部署理念冲突，且包体大 |
| SVG + motion 自绘 | ✅ 采用 | 零新增依赖，动画体系与全站统一（spring/pathLength/layoutId） |

## 实现范围

### 1. 技能雷达图（SkillRadar） ⏳
- About 页新增：六维技能雷达（Frontend / AI / Engineering / Design / Motion / Performance）
- SVG polygon + motion pathLength 入场绘制（多边形从中心展开）
- hover 顶点显示数值 tooltip；双主题配色
- 移动端：保持渲染（纯 SVG 轻量），reduced-motion 直接显示无动画

### 2. 文章统计条形图（BlogStats） ⏳
- Blog 列表页头部：按 tag 聚合文章数的横向条形图
- 条形 motion 弹性伸长入场（stagger）
- 点击 tag 条可过滤文章列表（客户端过滤）

### 3. 贡献热力图（ActivityHeatmap） ⏳
- About 页：GitHub 风格的年度写作/提交热力格子（数据静态生成）
- 格子 stagger 淡入，hover 显示日期 + 强度
- 双主题：深色蓝紫渐变 / 浅色陶土渐变

### 4. 代码演示卡（不用 Sandpack 的替代） ⏳
- Showcase 页：静态代码块 + 「Live」预览并排（现有组件实例即预览）
- 复用 FlipCard：正面 live demo / 背面代码，已在 Phase 5 建立模式
- 本项只需给现有 demo 区补代码片段背面

## 验收标准

- [ ] About 页雷达图入场绘制动画 + hover tooltip
- [ ] Blog 页 tag 条形图可点击过滤文章
- [ ] About 页热力图 hover 显示详情
- [ ] 全部零新增运行时依赖
- [ ] reduced-motion 降级（无动画直接显示）
- [ ] ESLint 0/0 + build 通过 + 全路由 200

## 实现顺序

1. SkillRadar（视觉冲击最大）
2. BlogStats + tag 过滤（实用性最强）
3. ActivityHeatmap
4. Showcase 代码演示卡补齐
