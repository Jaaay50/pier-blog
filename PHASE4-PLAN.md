# Phase 4: 极端微交互

**核心定位**：音效级细节反馈，让每个悬停、点击、输入都有物理质感与视觉惊喜。

## 实现范围

### 1. 主题切换创意过渡 ⏳
- **圆形扩散遮罩**（View Transitions API `::view-transition-old/new` + clip-path）
- 起点：ThemeToggle 按钮中心
- 深→浅：暖陶土扩散吞噬深空；浅→深：科技蓝晕扩散覆盖纸面
- 降级：不支持时保留现有瞬切

### 2. 按钮/链接音效级反馈 ⏳
- **涟漪扩散**：点击任意按钮（非 LiquidButton）时从点击位置扩散半透明涟漪，0.6s 淡出
- **按压形变**：所有可点击元素 active 时 `scale(0.98)` + `brightness(0.95)`，配合 cubic-bezier 弹簧曲线
- **果冻弹跳**：主 CTA 按钮 hover 时轻微上下弹跳（keyframes，1.2s 无限循环）

### 3. 文字 hover 微动效 ⏳
- **标题呼吸发光**：首页 Hero 标题与 About 页面标题 hover 时 `text-shadow` 呼吸（0→8px blur，2s 循环）
- **字母弹射**（可选）：Navbar 链接 hover 时当前字母 translateY(-2px) stagger（motion stagger children）

### 4. TOC/导航果冻高亮 ⏳
- **TableOfContents**：当前章节高亮不用静态 accent 色块，改为弹性果冻背景（scale 1.05 + 轻微 rotate）
- **Navbar activeLink**：给当前路由链接加底部弹性下划线（motion layoutId="underline"）

### 5. 输入与悬停的弹簧物理 ⏳
- **表单输入**（如未来搜索框）：focus 时边框弹性扩张（scale 1.02 + glow）
- **SpotlightCard**：鼠标移动追踪改用弹簧插值（motion useSpring），不再是线性跟随

### 6. 滚动锚点平滑跳转 ⏳
- TOC 点击锚点时用 Lenis.scrollTo + easing，不用浏览器原生 # 跳转
- 配合 ScrollProgress 轻微闪烁提示（brightness pulse）

### 7. 移动端体验打磨（降级与适配） ⏳
- **HorizontalArticles**：触控设备关闭鼠标视差，改为 snap scroll 提示（左右渐隐指示器）
- **ProjectsBento hover**：触控下 hover 无意义，改为 tap 时短暂高亮（touchstart → 300ms 后自动恢复）
- **自定义光标**：已在 Phase 3 禁用，此处补测

### 8. Lighthouse 性能基线与调优 ⏳
- 本地跑 Lighthouse（Desktop + Mobile）
- 目标：LCP < 2.5s / CLS < 0.1 / INP < 200ms
- 重点排查：首屏 Galaxy shader 对 LCP 的影响、TransitionLink 是否阻塞导航、Lenis RAF 是否占用主线程
- 输出报告（JSON）存入 `docs/lighthouse/`

## 技术清单

- motion `useSpring` / `stagger` / `layoutId`
- View Transitions API `document.startViewTransition` + CSS `::view-transition-*`
- Lenis `scrollTo(target, { offset, duration })`
- Lighthouse CI（或手动 `npx lighthouse`）

## 验收标准

- [ ] 主题切换从按钮中心扩散（桌面端，支持 View Transitions 的浏览器）
- [ ] 所有按钮/链接点击有涟漪 + 按压形变
- [ ] TOC 高亮为果冻背景，Navbar 当前路由有弹性下划线
- [ ] 移动端：横向画廊无视差、Bento tap 高亮、光标禁用
- [ ] Lighthouse Desktop 首页 Performance ≥90 分
- [ ] 全交互路径（切换主题、TOC 跳转、卡片悬停）无卡顿（FPS Monitor 稳定 ≥55）

## 实现顺序

1. 主题切换扩散（最有视觉冲击力）
2. 按钮涟漪 + 按压形变（通用交互基础）
3. TOC/Navbar 果冻高亮与弹性下划线
4. 移动端降级适配
5. Lighthouse 基线与调优（可能触发回滚或参数调整）
6. 文字 hover 微动效（锦上添花）

---

**预估工作量**：3-4 小时（含 Lighthouse 调优迭代）  
**完成后推送至** `origin/main` 并触发部署，移动端真机验收交给桥。
