# Phase 5: 实验性布局

**核心定位**：打破传统上下滚动模式，探索横向叙事、多层视差、SVG 路径动画等前沿布局交互。

## 实现范围

### 1. 横向滚动时间线 ⏳
- **About 页 Experience 区**：改为横向滚动叙事（scroll-snap）
- 每个经历卡片占满视口宽度，左右滑动翻页
- 顶部进度指示器（当前卡片高亮点）
- 配合 ScrollTrigger 分段显示装饰元素（如年份 SVG 数字）

### 2. 多层视差深度 ⏳
- **首页 Hero 区**：现有背景+标题视差基础上，新增第三层装饰元素
  - 前景浮动图形（如几何形状）：滚动速度最快（×1.5）
  - 中景标题：现有速度（×1）
  - 背景 Galaxy/Aurora：现有速度（×0.8）
- 实现立体纵深感

### 3. SVG 路径动画 ⏳
- **About 页 Experience 时间线**：用 SVG `<path>` 替代静态 border-left
- 路径随滚动进度绘制（`stroke-dasharray` + ScrollTrigger）
- 关键节点（每个经历）出现时路径延伸到该点并闪烁

### 4. 粘性章节钉住（Pinned Sections） ⏳
- **Blog 文章页**：长文章分段钉住，每节停留直到滚完内容才释放
- 配合 gsap.pin + ScrollTrigger，每节背景色轻微渐变提示过渡

### 5. 可选：3D 卡片翻转展示 ⏳
- **Showcase 页**：组件演示卡片改为可点击 3D 翻转（正面预览 / 背面代码）
- rotateY 180deg + preserve-3d，配合 AnimatePresence

## 技术清单

- GSAP ScrollTrigger `pin` / `scrub` / batch
- motion `useScroll` + `useTransform` 多层视差
- SVG `<path>` + `stroke-dashoffset` 动画
- CSS `perspective` / `transform-style: preserve-3d`
- Lenis horizontal scroll 模式（实验性）

## 验收标准

- [ ] About 页 Experience 横向滚动，顶部进度点高亮
- [ ] 首页 Hero 三层视差（前景浮动图形 + 中景标题 + 背景 shader）
- [ ] About 页时间线 SVG 路径随滚动绘制
- [ ] Blog 文章页长内容分段钉住（可选，看是否干扰阅读）
- [ ] Showcase 卡片 3D 翻转（可选）
- [ ] 移动端降级：横向滚动改为竖向堆叠，视差关闭

## 实现顺序

1. About 页 Experience 横向滚动时间线 + 进度指示器
2. 首页 Hero 多层视差（新增前景浮动几何形状）
3. SVG 路径动画时间线
4. （可选）Blog 文章页分段钉住
5. （可选）Showcase 3D 翻转卡片

---

**预估工作量**：3-4 小时（含移动端降级测试）  
**完成后**推送至 `origin/main` 并触发部署。
