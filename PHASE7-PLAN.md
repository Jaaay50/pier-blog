# Phase 7: AI 增强

> 实现状态（2026-08-11）：本阶段已完成并部署；本文保留历史规划口径，最终交付、主动裁则与验证结果见 `PROGRESS.md` 的 Phase 7 记录。

**核心定位**：从静态博客进化为智能内容平台，用 AI 能力提升内容发现与理解效率。

## 依赖决策

| 候选 | 结论 | 理由 |
|---|---|---|
| FlexSearch | ✅ 采用 | 8KB gzip，客户端全文索引，离线可用，无外部依赖 |
| OpenAI Embeddings + 向量搜索 | ❌ 不引入 | 需运行时 API 调用（延迟 + 成本），静态站点理念冲突 |
| 构建时 AI 摘要生成 | ❌ 裁掉 | 需在 CI 引入 LLM API key，且现有手写 description 已满足需求，收益不足以抵消密钥与维护成本 |
| 客户端流式 AI 对话 | ❌ 不引入 | 需暴露 API key 或建后端代理，不符合纯静态架构 |

## 实现范围

### 1. FlexSearch 全文搜索 ⏳
- **搜索栏组件（SearchBar）**：Navbar 右侧（移动端悬浮按钮）
- **模态框（SearchModal）**：Cmd/Ctrl+K 唤起，fuzzy 匹配标题 + 描述 + 标签 + 正文片段
- **索引构建**：`/api/search-index` 或构建时静态 JSON，包含所有文章 MDX 纯文本（去 frontmatter）
- **高亮匹配**：结果中关键词高亮（split + wrap）
- **键盘导航**：上下箭头选择，Enter 跳转，Esc 关闭

### 2. 构建时 AI 摘要（可选，视 LLM 可用性） ⏳
- **摘要注入**：GitHub Actions 或本地 build 脚本，读 MDX → LLM 生成 150 字摘要 → 写回 frontmatter `aiSummary` 字段
- **展示位置**：BlogCard 可选显示 AI 摘要标记（如「AI 精炼：…」）
- **降级**：无 `aiSummary` 时回退到手写 description

### 3. 相关文章推荐（简单版） ⏳
- **算法**：基于 tag 交集数量 + 日期相近度简单打分（无需向量）
- **展示位置**：文章页底部「相关阅读」区，最多 3 篇
- **实现**：服务端 `getRelatedPosts(currentSlug, allPosts)` 工具函数

### 4. 搜索分析（可选，静态化） ⏳
- **无搜索结果时**：显示最热 tag 或最新文章兜底
- **搜索历史**：localStorage 缓存最近 5 次搜索（客户端持久化）

## 验收标准

- [ ] Cmd/Ctrl+K 唤起搜索框，fuzzy 匹配全部文章
- [ ] 搜索结果高亮匹配词，键盘导航可用
- [ ] 文章页底部显示相关阅读（至少 1 篇时显示）
- [ ] （可选）BlogCard 显示 AI 摘要标记
- [ ] 零运行时 API 调用，索引文件 < 100KB
- [ ] reduced-motion 时模态框无动画
- [ ] ESLint 0/0 + build 通过 + 全路由 200

## 实现顺序

1. FlexSearch 搜索栏 + 模态框（最核心）
2. 相关文章推荐（简单算法）
3. （可选）构建时 AI 摘要注入流程
4. 搜索历史与兜底体验优化

---

**预估工作量**：2-3 小时（搜索为主，AI 摘要看 LLM 可用性可选做）  
**完成后**推送至 `origin/main` 并触发部署。
