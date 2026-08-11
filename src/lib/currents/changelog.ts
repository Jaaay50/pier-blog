/**
 * 潮汐 · Currents 更新日志数据源。
 *
 * 维护约定：
 * - 新条目添加到数组最前面（倒序展示，最新在上）。
 * - 只记录用户能感知的变化；重大数据/架构调整可附一段 note，不写 commit 列表。
 * - 中英文逐条对等，英文自然表达，不做机械直译。
 * - 不写入服务器地址、内部路径、凭据、模型中转、备份位置等运维细节。
 * - phase 字段为内部可追溯标识，对用户展示的是 date 与 phaseLabel。
 * - date 语义为 Asia/Hong_Kong 日历日；页面按 HKT 格式化，UTC 构建环境不换日。
 */

export type ChangelogItemType = "new" | "improved" | "fixed" | "announced" | "removed";

export interface ChangelogItem {
  type: ChangelogItemType;
  titleZh: string;
  titleEn: string;
  descZh?: string;
  descEn?: string;
}

export interface ChangelogEntry {
  /** 内部阶段标识，用于可追溯 */
  phase: string;
  date: string; // ISO 日期，用户可见
  phaseLabelZh: string;
  phaseLabelEn: string;
  noteZh?: string;
  noteEn?: string;
  items: ChangelogItem[];
}

export const CHANGELOG_LAST_UPDATED = "2026-08-11";

export const changelogEntries: ChangelogEntry[] = [
  {
    phase: "phase3",
    date: "2026-08-11",
    phaseLabelZh: "Phase 3 · 产品闭环",
    phaseLabelEn: "Phase 3 · Product Loop",
    noteZh: "潮汐从「内容产品」补全为「可发现、可接入、可反馈」的完整产品：Agent 接入与全局反馈上线，全站搜索不再只覆盖博客。",
    noteEn: "Currents grows from a content product into a complete, discoverable one: Agent Access and global Feedback are live, and site search no longer covers only the blog.",
    items: [
      {
        type: "new",
        titleZh: "Agent 接入页面上线",
        titleEn: "Agent Access Page",
        descZh: "新增 Agent 接入页：五个只读工具说明、MCP 连接配置、Skill 安装步骤、验证问题与排障指南。受邀开放、只读、中英双语。",
        descEn: "A new Agent Access page: five read-only tools, MCP connection configs, Skill installation, verification questions, and troubleshooting. Invite-only, read-only, bilingual.",
      },
      {
        type: "new",
        titleZh: "全局反馈页面上线",
        titleEn: "Global Feedback Page",
        descZh: "新增独立反馈页：产品问题、功能建议、信源建议与 Agent 接入问题都可以匿名提交；详情页的内容纠错保留并更名为「报告内容问题」。",
        descEn: "A new standalone Feedback page: product issues, feature ideas, source suggestions, and Agent access problems — all anonymous. In-context content correction stays on detail pages, renamed to Report a content issue.",
      },
      {
        type: "new",
        titleZh: "潮汐常驻导航",
        titleEn: "Persistent Currents Navigation",
        descZh: "潮汐所有页面新增统一的左侧导航：精选、全部动态、热点榜、AI 日报、主题、收藏、Agent 接入一跳可达；移动端改为抽屉导航。",
        descEn: "All Currents pages share a persistent left rail — Featured, All Updates, Hot Board, AI Daily, Topics, Favorites, and Agent Access are one click away. On mobile it folds into a drawer.",
      },
      {
        type: "improved",
        titleZh: "全站搜索覆盖潮汐",
        titleEn: "Site Search Covers Currents",
        descZh: "全站搜索不再只索引博客：功能页面、主题与更新日志都能被搜到，搜索 MCP、Skill、Agent、反馈时直达对应功能页。",
        descEn: "Site search no longer indexes only the blog: feature pages, topics, and the changelog are all searchable — searching MCP, Skill, Agent, or Feedback takes you straight to the right page.",
      },
    ],
  },
  {
    phase: "phase2",
    date: "2026-08-07",
    phaseLabelZh: "Phase 2 · 事件基础与质量门槛",
    phaseLabelEn: "Phase 2 · Event Foundation & Quality Gate",
    noteZh: "热点榜从实时聚合升级为持久化事件层：每个事件有稳定身份、生命周期与双语综述，主榜有了明确的质量门槛，低置信聚合不再打扰主榜，而是列入「观察中」。",
    noteEn: "The Hot Board moves from real-time aggregation to a persistent event layer: every event now has a stable identity, a lifecycle, and a bilingual summary. The main board gains an explicit quality bar, and low-confidence clusters move to a separate Watching section.",
    items: [
      {
        type: "fixed",
        titleZh: "报道撤回与事件拆分",
        titleEn: "Report Withdrawal & Event Split",
        descZh: "已撤回或失效的报道现在会正确离开事件并重算热度与资格，不再残留旧内容；被错误合并的事件在语义纠正后可以可靠拆分，旧事件身份始终可追溯。",
        descEn: "Withdrawn or invalidated reports now correctly leave their events and trigger a recalculation of heat and qualification, instead of lingering as stale content. Mistakenly merged events can now be split reliably once their semantics are corrected, with the original event identity always traceable.",
      },
      {
        type: "new",
        titleZh: "事件层上线",
        titleEn: "Event Layer",
        descZh: "同一事件的多家报道被归并为一个有稳定身份的事件，持续跟踪其最新进展；事件合并可追溯，报道更新会刷新事件的真实活动时间。",
        descEn: "Reports of the same story are merged into one event with a stable identity that keeps tracking new developments. Merges are traceable, and report updates refresh the event's real activity time.",
      },
      {
        type: "new",
        titleZh: "热点榜四类切换",
        titleEn: "Hot Board Type Tabs",
        descZh: "热点榜支持综合 / 新闻 / 产品发布 / 研究四类切换，快速聚焦你关心的事件类型。",
        descEn: "The Hot Board now switches between All, News, Products, and Research, so you can focus on the kind of events you care about.",
      },
      {
        type: "new",
        titleZh: "「观察中」分组",
        titleEn: "Watching Section",
        descZh: "尚不足以进入主榜的聚合（单信源、仅收录入口或社区讨论不足）单独列入「观察中」，主榜更干净。",
        descEn: "Clusters that don't yet qualify — single-source, aggregator-only, or lacking community traction — are listed under Watching, keeping the main board clean.",
      },
      {
        type: "improved",
        titleZh: "主榜质量门槛",
        titleEn: "Main Board Quality Bar",
        descZh: "进入主榜需至少两家独立报道，或一家官方来源加显著社区讨论；论文收录入口（arXiv / HF Daily Papers）不再单独构成热点。",
        descEn: "The main board now requires at least two independent reports, or one official source with significant community discussion. Paper listing entries (arXiv / HF Daily Papers) no longer qualify on their own.",
      },
      {
        type: "improved",
        titleZh: "事件综述与热度",
        titleEn: "Event Summaries & Heat",
        descZh: "高置信事件自动生成中英双语综述与进展摘要；热度值由独立报道数与社区讨论强度共同决定，并按 3 小时粒度采样跟踪。",
        descEn: "High-confidence events get auto-generated bilingual summaries and progress notes. Heat combines independent report count with community traction, sampled every 3 hours.",
      },
      {
        type: "fixed",
        titleZh: "重复信源与共享链接",
        titleEn: "Duplicate Sources & Shared URLs",
        descZh: "修复同一来源重复采集被误计为多家报道的问题；不同来源引用同一链接时现在可以正确分别署名。",
        descEn: "Fixed repeated fetches from one source being counted as multiple reports. Different outlets referencing the same URL are now credited independently.",
      },
    ],
  },
  {
    phase: "batch2",
    date: "2026-08-06",
    phaseLabelZh: "批次 2 · 含 Phase 7",
    phaseLabelEn: "Batch 2 · incl. Phase 7",
    noteZh: "本批次让 Currents 从“按时间浏览”走向“按事件与主题浏览”，并补齐深度阅读的最后一环：原文翻译；同期完成了 Phase 7 排版优化（三档密度与时间线分层）。",
    noteEn: "This batch moves Currents beyond a plain timeline — you can now browse by events and topics, and deep reading is completed with full-text translation. It also includes the Phase 7 layout refinement (three densities and a re-layered timeline).",
    items: [
      {
        type: "new",
        titleZh: "热点榜上线",
        titleEn: "Hot Board",
        descZh: "新增「热点榜」页面，聚合 48 小时内被多家报道的事件，展示事件状态、热度值与去重信源数量；暂时没有热点时自动放宽到近 7 天，不会出现空页面。",
        descEn: "A new Hot Board groups events reported by multiple outlets within 48 hours, showing each event's status, heat score, and distinct source count. When nothing qualifies, it automatically falls back to the last 7 days instead of showing an empty page.",
      },
      {
        type: "new",
        titleZh: "主题地图上线",
        titleEn: "Topic Map",
        descZh: "新增「主题地图」页面，38 个主题按「公司与模型 / 技术方向 / 内容形态」分组，覆盖 OpenAI、Anthropic、Agent、推理、机器人等方向，可快速进入任一主题的完整动态。",
        descEn: "A new Topic Map organizes 38 topics — OpenAI, Anthropic, agents, reasoning, robotics, and more — into company & model, technical direction, and content-type groups, each linking to a full topic feed.",
      },
      {
        type: "new",
        titleZh: "主题详情页上线",
        titleEn: "Topic Detail Pages",
        descZh: "每个主题拥有独立页面，包含主题说明、完整时间线与分页，并具备双语 SEO 信息与站点地图收录。",
        descEn: "Every topic now has its own page with a description, a full paginated timeline, bilingual SEO metadata, and sitemap coverage.",
      },
      {
        type: "new",
        titleZh: "原文翻译上线",
        titleEn: "Original Text Translation",
        descZh: "详情页新增「原文翻译」标签，与 AI 导读、深度解读并列；历史精选内容已补齐翻译，新内容入库后自动翻译。",
        descEn: "Detail pages gain an Original Translation tab alongside the AI summary and deep read. Featured archive entries have been backfilled, and new entries are translated automatically as they arrive.",
      },
      {
        type: "new",
        titleZh: "三档阅读密度",
        titleEn: "Three Reading Densities",
        descZh: "时间线支持紧凑 / 标准 / 宽松三档密度，默认标准；选择在浏览器中记住并在多个标签页间同步。",
        descEn: "The timeline now offers compact, standard, and comfortable densities (standard by default). Your choice is remembered in the browser and synced across tabs.",
      },
      {
        type: "improved",
        titleZh: "正文素材更完整",
        titleEn: "Fuller Source Material",
        descZh: "新内容与历史内容都尽量补全正文；论文类内容改用干净的摘要作为素材，不再混入带导航噪音的页面文本。",
        descEn: "Both new and archived entries now carry fuller source text. Papers use clean abstracts instead of noisy scraped page content.",
      },
      {
        type: "improved",
        titleZh: "卡片信息分层与时间线排布",
        titleEn: "Clearer Card Hierarchy and Timeline Layout",
        descZh: "推荐理由、标签与多信源信息重新分层；桌面端时间轴更舒展，高分内容更易一眼识别。",
        descEn: "Recommendation reasons, tags, and multi-source info are re-layered; the desktop timeline breathes more and high-score items stand out at a glance.",
      },
      {
        type: "fixed",
        titleZh: "已读卡片误隐藏标题",
        titleEn: "Read Cards Hiding Their Titles",
        descZh: "修复标准 / 宽松密度下已读卡片连标题一起收起的问题；现在只收起摘要，标题始终可见。",
        descEn: "Fixed read cards collapsing their titles in standard and comfortable densities — now only the summary folds away, and the title always stays visible.",
      },
      {
        type: "fixed",
        titleZh: "详情页分类与来源显示",
        titleEn: "Category and Source Display on Detail Pages",
        descZh: "修复详情页分类名称不随语言切换、来源名称与作者显示不正确的问题。",
        descEn: "Fixed detail pages showing untranslated category names and incorrect source or author labels.",
      },
    ],
  },
  {
    phase: "phase6",
    date: "2026-08-05",
    phaseLabelZh: "Phase 6",
    phaseLabelEn: "Phase 6",
    noteZh: "上线首日规模最大的升级：Currents 从「可用初版」升级为完整的 AI 资讯产品。",
    noteEn: "The largest single-day upgrade since launch: Currents grew from a working MVP into a full AI news product.",
    items: [
      {
        type: "new",
        titleZh: "详情页改为独立页面",
        titleEn: "Standalone Detail Pages",
        descZh: "每条内容拥有独立链接与完整 SEO 信息（标题、描述、结构化数据），可直接分享与收藏；旧的弹窗链接自动跳转到新页面。",
        descEn: "Every item now has its own shareable, bookmarkable URL with full SEO metadata and structured data. Legacy overlay links redirect automatically.",
      },
      {
        type: "new",
        titleZh: "精选 / 全部动态 / 论文三视图",
        titleEn: "Three Views: Selected, All, Papers",
        descZh: "顶层新增三个视图，并可叠加分类、来源与最低评分筛选，按自己的节奏浏览。",
        descEn: "Three top-level views — Selected, All Updates, and Papers — plus category, source, and minimum-score filters introduced in this phase, so you can browse at your own depth.",
      },
      {
        type: "new",
        titleZh: "潮汐日报上线",
        titleEn: "Currents Daily",
        descZh: "每天自动整理一份日报：一条头条加「模型 / 产品 / 行业 / 研究 / 技巧观点」五个板块，可翻历史归档。",
        descEn: "A daily digest is generated automatically: one headline plus five sections — models, products, industry, research, and tips & opinions — with browsable archives.",
      },
      {
        type: "new",
        titleZh: "今日要闻",
        titleEn: "Today's Highlights",
        descZh: "时间线顶部展示 1 条主故事加 4 条次要故事；数据不足时自动隐藏，不显示空板块。",
        descEn: "The timeline opens with one lead story and four supporting stories; the section hides itself automatically when there isn't enough material.",
      },
      {
        type: "new",
        titleZh: "已读弱化",
        titleEn: "Read-State Dimming",
        descZh: "读过的内容自动弱化显示（记录保存在本地浏览器），帮你专注还没看的部分。",
        descEn: "Items you've read are dimmed automatically (tracked locally in your browser) so you can focus on what's new.",
      },
      {
        type: "improved",
        titleZh: "信源大幅扩充",
        titleEn: "Major Source Expansion",
        descZh: "新增 13 个经实测验证的信源，包括 Google、微软、NVIDIA、GitHub、Cloudflare 官方博客及多家国际与中文科技媒体；综合媒体源增加 AI 相关性过滤，减少噪音。",
        descEn: "Thirteen field-verified sources were added — official blogs from Google, Microsoft, NVIDIA, GitHub, and Cloudflare, plus international and Chinese tech media — with AI-relevance filtering on general outlets to keep noise down.",
      },
      {
        type: "improved",
        titleZh: "内容覆盖回填至 7 月初",
        titleEn: "Archive Backfilled to Early July",
        descZh: "历史内容逐日回填至 2026 年 7 月 1 日，累计两千余条入库，时间线不再有断档。",
        descEn: "The archive was backfilled day by day to July 1, 2026 — over two thousand entries — so the timeline has no gaps.",
      },
      {
        type: "improved",
        titleZh: "卡片可整卡点击",
        titleEn: "Fully Clickable Cards",
        descZh: "卡片改为真正的链接，支持新标签页打开、中键点击等浏览器原生行为。",
        descEn: "Cards are now real links, so open-in-new-tab, middle-click, and other native browser behaviors work as expected.",
      },
      {
        type: "fixed",
        titleZh: "「全部动态」看不到全部内容",
        titleEn: "All Updates Wasn't Showing Everything",
        descZh: "修复「全部」视图默认隐藏部分低分内容的问题，现在名副其实。",
        descEn: "Fixed the All Updates view silently hiding lower-scored items — it now genuinely shows everything.",
      },
    ],
  },
  {
    phase: "launch",
    date: "2026-08-05",
    phaseLabelZh: "首发上线 · Phase 1–5",
    phaseLabelEn: "Launch · Phases 1–5",
    noteZh: "潮汐 · Currents 正式上线：从立项到上线一天完成。",
    noteEn: "Currents officially launched — from kickoff to production in a single day.",
    items: [
      {
        type: "announced",
        titleZh: "潮汐 · Currents 正式上线",
        titleEn: "Currents Is Live",
        descZh: "全新的 AI 资讯板块：每天自动采集 arXiv、Hugging Face、Hacker News 与多家官方博客，由 AI 生成中英双语标题、摘要、0–100 推荐评分、一句话推荐理由与深度解读；同一事件多信源自动合并去重。",
        descEn: "A brand-new AI news section: content is collected daily from arXiv, Hugging Face, Hacker News, and official research blogs, then enriched by AI into bilingual titles, summaries, a 0–100 recommendation score, a one-line reason to read, and an in-depth analysis. Multi-source coverage of the same story is merged and deduplicated automatically.",
      },
      {
        type: "new",
        titleZh: "双语全文搜索",
        titleEn: "Bilingual Full-Text Search",
        descZh: "支持中英文全文检索，并可按分类过滤。",
        descEn: "Full-text search in both Chinese and English, with category filters.",
      },
      {
        type: "new",
        titleZh: "本地收藏",
        titleEn: "Local Favorites",
        descZh: "无需登录即可收藏内容，记录仅保存在自己的浏览器中。",
        descEn: "Bookmark items without an account — favorites are stored only in your own browser.",
      },
      {
        type: "new",
        titleZh: "双语 RSS 订阅",
        titleEn: "Bilingual RSS Feeds",
        descZh: "提供中文与英文 RSS 订阅，可按分类单独订阅。",
        descEn: "Chinese and English RSS feeds, with per-category subscriptions available.",
      },
    ],
  },
  {
    phase: "phase0",
    date: "2026-08-05",
    phaseLabelZh: "Phase 0",
    phaseLabelEn: "Phase 0",
    noteZh: "正式动工前的可行性验证，为当天上线铺路。",
    noteEn: "Feasibility checks before the build began, paving the way for same-day launch.",
    items: [
      {
        type: "announced",
        titleZh: "立项与环境验证",
        titleEn: "Project Kickoff and Environment Checks",
        descZh: "确认在现有基础设施上安全承载 AI 采集与处理管线，不新增成本、不影响任何已在运行的服务；验证完成后当天即开始构建。",
        descEn: "Verified that the AI collection and processing pipeline could run safely on existing infrastructure — at zero added cost and with no impact on services already in production. The build began the same day.",
      },
    ],
  },
];
