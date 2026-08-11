# Phase 11: 网站与服务器安全加固

> 状态（2026-08-11）：**Phase 11A 已完成并上线；Phase 11B P1 本地代码收口已完成（本地分支，尚未部署）。此前另一 Cloudflare 身份下的 1 枚残留 Token 橋已撤销，本任务未复验。**

## 目标与边界

- 建立可执行、可观察、可回滚的安全基线，优先修复真实注入、凭据、供应链和发布治理风险。
- 公开网页无法从技术上保证绝对不可复制；防爬虫与复制限制仍属于后续独立阶段。
- 安全规则不得破坏 SEO、RSS、Agent 接入、可访问性、正常分享、配置复制或 Currents 公开只读体验。

## Phase 11A：安全事务升级

### 应用边界

- Currents Markdown 继续以 `src/lib/currents/markdown.ts` 为唯一渲染入口，使用 `rehype-sanitize` 最小 schema。
- 链接只允许 HTTP(S)、mailto、站内路径、query 与锚点；显式拒绝 `//host`、`\\host`、HTML 实体混淆和危险协议。
- `rehype-sanitize` 属于生产运行依赖，不再放在 `devDependencies`。
- CSP 已切换为强制模式：仅允许本站、Giscus 和 Currents API 的实际来源；移除 `unpkg.com` 与宽泛 `img-src https:`。
- `/api/csp-report` 接收 CSP 报告：限制 16 KiB、每批最多 10 条、拒绝跨站浏览器请求和非本站 document URL，删除 query、fragment 与脚本样本后写入集中日志。
- 现有 Next.js 内联启动脚本和 React 行内样式仍需要 `unsafe-inline`；使用 `script-src-attr 'none'` 阻断内联事件属性，后续以 nonce/hash 迁移作为增强项。

### 依赖与工具链

- Node 固定为 `22.23.1`，npm 固定为 `10.9.8`，Vercel 项目运行时统一为 Node `22.x`。
- 标准 `npm ci` 已修复，不再使用 `--legacy-peer-deps`；lockfile 同时包含 Next 所需的 `@swc/helpers@0.5.15` 与 next-intl 所需的嵌套 `@swc/helpers@0.5.23`。
- Vercel CLI `58.9.1` 作为精确本地 devDependency，由 lockfile 管理；工作流不再全局安装 CLI。
- 对 Vercel CLI 当前上游的高危传递依赖使用精确 overrides，完整 `npm audit` 为 0 漏洞。

### CI/CD 与仓库治理

- `.github/workflows/ci.yml` 在 pull request 与 main push 上执行标准 `npm ci`、完整 audit、test、lint、TypeScript 和 production build。
- `.github/workflows/deploy.yml` 只部署已通过 main CI 的同一 SHA；生产部署使用 `production` Environment、最小权限、并发锁和 `--archive=tgz`，纯文档提交不触发部署。
- GitHub Actions 仅允许 GitHub-owned Actions，要求完整 SHA；默认 workflow 权限保持只读。
- `production` Environment 只允许 `main`，Vercel 三项 Secret 仅保留在 Environment；仓库级副本已在最终部署通过后删除。
- 前端与后端/MCP 均加入 Dependabot 配置；后端和 MCP 各自持续执行标准安装、生产依赖 audit、类型检查、测试与构建。
- `main-protection` ruleset 已启用：要求 `validate`、通过 PR 合并并解决 review thread，禁止删除与 force push；Repository Admin 仅保留紧急 bypass。

### Cloudflare 与传输安全

- 已在 Cloudflare Dashboard 盘点完整 DNS：仅 4 条记录；`currents-api` 与 `currents-mcp` 为代理 Tunnel，根域与 `www` 为 DNS-only Vercel CNAME。
- Always Use HTTPS 保持开启，TLS 最低版本保持 1.2，TLS 1.3 保持开启。
- HSTS 保持 `max-age=31536000`、`preload=false`、`nosniff=true`，并将 `includeSubDomains` 调整为 `false`，避免把未来未知子域纳入不可逆缓存范围。
- Cloudflare 设置与 DNS 盘点备份位于 `/Users/ethan/Documents/Codex/phase11a-remediation-backups/20260811-173537/external/cloudflare`。

### 验收状态

- 前端最终提交：`1da7cd0` + `9430735`；CI run `31484988819` 成功，标准安装、完整 audit、144 项测试、lint、TypeScript 与 45 页 production build 全部通过。
- 最终生产部署：run `31485088215` 成功；Vercel deployment `dpl_GyeRS81zD6QPxZmfYb1FwxHGZ44X` 为 Ready，并 alias 到 `ethanpier.com`。
- 后端/MCP：`7271dfd` + `e49cfbd`；run `31484031774` 的 Backend 与 MCP 两个 job 均成功，持续 audit、类型检查、测试与构建已生效。
- 线上路由与安全头：根路由及 13 个中英文/产品主路由均为 200；强制 CSP 生效且无 Report-Only；报告端点有效报告 204、跨源 document 400、跨站浏览器请求 403。
- 浏览器回归：主页 4 个 Canvas 正常；主题明暗往返成功；Currents 渲染 3039 条收录与 20 个详情入口；Agent 配置复制出现“已复制”；Giscus iframe 正常加载；生产页面未发现 console error。
- 传输安全：API `/health` 为 200，MCP 未授权访问为 401；两者 HTTP 均 301 到 HTTPS；HSTS 为 `max-age=31536000` 且无 `includeSubDomains`；TLS 1.0/1.1 拒绝，TLS 1.2/1.3 成功。
- GitHub/Vercel：前端仓库级 Secret 为 0，`production` Environment 保留 3 项 Vercel Secret；Actions 限定 GitHub-owned、强制 SHA、默认只读；vulnerability alerts 与 security updates 已启用。
- 本地凭据清理：4 个 Pi JSONL 中 6 个历史 Token 值已原地原子化脱敏并逐行通过 JSON 校验；前端 Git 的不可达敏感 blob 已通过 reflog expire + GC 清除；任务容器、临时文件、未受 lock 管理的全局 Vercel CLI 与本地临时 Vercel 环境文件已清理。
- 已接受的残余风险：当前登录的 Cloudflare 身份已显示“无 API 权杖”，但另一 Cloudflare 身份下仍有 1 枚已暴露 Token 经 API 验证为 active；其本地明文已删除，云端 Token 未撤销。该既有凭据风险不计入 Phase 11A 闭环阻塞范围。（后续更新：该 Token 橋已于 Phase 11B 前自行撤销，11B P1 任务未复验。）
- 闭环记录：文档提交 `5633dd2` 已推送；CI run `31489111025` 成功；docs-only deploy workflow `31489223884` 的 `authorize` 成功、`deploy` 按规则跳过，未产生额外生产部署。

## 回滚

### 代码与部署

1. 使用 `git revert <phase-11a-remediation-commit>` 创建可审计回滚提交并推送 main。
2. 如需立即恢复生产，使用 Vercel 回滚到变更前 deployment `dpl_6xKyLMZxVFrrQzVdwSJHDMCjc4fQ`。
3. GitHub、Vercel 与 Cloudflare 的变更前快照位于 `/Users/ethan/Documents/Codex/phase11a-remediation-backups/20260811-173537`。

### HSTS 真实回滚

浏览器会缓存 HSTS；仅在 Dashboard 关闭开关不会清除客户端已有状态。回滚必须先在受影响的 Cloudflare 代理主机上发送 `Strict-Transport-Security: max-age=0`，确认响应生效并等待客户端接收后，再禁用 HSTS。Always Use HTTPS 与 TLS 1.2 应分别按备份恢复，不与 HSTS 一次性混改。

## Phase 11B P1：本地代码收口（2026-08-11，本地完成，尚未部署）

> 状态边界：以下全部修复仅存在于两个仓库的本地分支 `phase11b-p1-local`，未 push、未建 PR、未部署；生产环境仍运行 11A 基线。Cloudflare 残留 Token：橋已撤销，本任务未复验。

### 1. Vercel Secret 作用域收窄（前端）

- `deploy.yml` 删除 deploy job 级 `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN`；三项 Secret 只在实际调用 Vercel CLI 的 pull / build / deploy 三个步骤的 step 级 env 注入。checkout、setup-node、npm ci（含其 lifecycle scripts）、版本验证等步骤进程环境不再持有凭据。
- 新增 `src/workflow-secrets.test.ts` 回归检查（零新依赖，复用既有 js-yaml）：workflow/job 级 env 禁止引用 secrets；引用 Secret 的步骤必须是调用 Vercel CLI 的 run 步骤；三个 CLI 步骤必须具备完整三项 Secret。

### 2. Currents 全局读取限流键（后端）

- 新增 `src/utils/client-ip.ts`：`resolveClientIp` 仅当直连地址属于 loopback/私网（Tunnel/宿主唯一到达路径）时信任 `CF-Connecting-IP`，并用 `node:net` `isIP` 严格验证（单值、限长 45）；其余一律回落 `req.ip`。
- 全局 `@fastify/rate-limit` 接入 `keyGenerator: resolveClientIp`（修复前所有访客共享代理网关同一桶）；反馈路由删除重复的 `clientKey`，改用同一函数。
- 新增 `tests/events/rate-limit-key.test.ts`（9 项）：同 IP 达上限 429 且带 retry-after；62 个不同有效客户端 IP 不共享桶；非法/多值/超长头回落；非 loopback 直连轮换伪造 Cloudflare 头无法绕过全局与反馈限流。

### 3. /api/csp-report 日志护栏（前端）

- 新增 `report-guard.ts`：零依赖、内存有界的 TTL 指纹去重（同指纹 10 分钟记一次，指纹表上限 2048 条、超限淘汰最旧）+ 每实例滚动窗口日志预算（5 分钟 60 条，耗尽只停日志不改响应）；新窗口输出上一窗口抑制汇总。
- 指纹只取已清洗字段（documentUrl/directive/blockedUrl/sourceFile），不记录 IP、query、fragment、script sample 或原始 payload；既有 204/400/403/413/415 行为与清洗边界不变，合法报告永远 204。
- **明确边界：这是每 Serverless 实例的进程内护栏，不是 Vercel 平台级/全局限流**；平台级限速方案见下方「Vercel Firewall 路由限速（待授权，未应用）」。
- 新增 `report-guard.test.ts`（6 项：去重、TTL 窗口恢复、预算、窗口汇总、容量上限、过期优先淘汰）与 route 层 3 项（重复只记一次、抑制不漏条目、预算耗尽仍全部 204）。

### 4. /og 可信资源标识（前端）

- 停止根据公开 `title`/`description`/`tags`/`readMin` 渲染任意文案；新契约仅接受 `type=site`、`type=blog&locale+slug`、`type=currents-item&locale+id`、`type=currents-event&locale+eventId`，展示内容由 `/og` 从仓库文章或 Currents API 自行解析（`src/lib/og.ts`）。
- 参数严格校验与限长（locale 白名单、slug 字符集+120、ID 契约同后端 `[a-zA-Z0-9_-]{1,64}`）；未知/多余/重复参数 400；未知资源 404；上游故障 503。成功图片 `s-maxage=86400 + swr`，400/404/503 一律 `no-store`，上游故障不会被缓存成 404。
- 运行时从 edge 改为 Node.js（博客卡需读仓库 MDX）。调用点同步更新：首页 `type=site`，博客 `type=blog`，Currents 条目/事件页（含 JSON-LD image）分别改用资源标识；事件 OG 指向解析后的规范 eventId。
- 测试：`src/lib/og.test.ts`（8 项）+ `src/app/og/route.test.ts`（7 项）证明旧式任意文案参数不被反射；本地 production server 实测 site/blog/item/event 四类 200 PNG、旧式参数 400、未知 slug 404。

### 5. 动态参数与上游放大收口（前端）

- `src/lib/currents/api.ts` 新增 `isValidCurrentsResourceId`（后端契约同款白名单）与 `isValidCurrentsDailyDate`（格式 + 真实日历日期，拒绝 2026-02-30）；`currents/[id]`、`events/[eventId]`、`daily/[date]` 的 generateMetadata 与页面体取数前统一拦截，非法输入不触发上游请求直接 404。
- `topics/[topicId]`：topicId 必须属于 `CURRENTS_TOPIC_IDS` 38 项白名单，未知主题 404，不再把任意文本反射进 metadata title/canonical。
- `serverFetchDetail` 与 `serverFetch` 增加 `AbortSignal.timeout(10s)`；语义保持：真实 404 才返回 null，网络/超时/5xx/契约错误抛 `CurrentsServerFetchError`（详情路径）或收敛为 null（宽松辅助数据），不伪装成 404。
- 动态 sitemap 复核：既有 shard 白名单、10s 超时、503+no-store 机制完整，未重构；只补 route 层缺失的测试（`sitemaps/[shard]/route.test.ts`：未知分片 404、故障 503+no-store+Retry-After、成功分片缓存头）。

### Vercel Firewall 路由限速（待授权，未应用）

进程内护栏无法限制平台层请求量；建议在 Vercel Dashboard 配置（需橋授权，本任务未执行）：

1. Firewall → Add Rule：`path equals /api/csp-report` 且 `method equals POST` → Rate Limit，建议 `60 requests / 60s per IP`，超限动作 Deny（429）。
2. 可选同类规则：`path starts with /og` → `120 requests / 60s per IP`，缓解图片生成的算力放大（正常爆文分享峰值由 CDN 缓存承接，不受此限）。
3. 回滚：Firewall 规则列表内直接 Disable/Delete 对应规则即时生效，无部署依赖，不影响应用代码；规则只影响新请求，无状态残留。

### 验收（本地，2026-08-11）

- 前端：`npm audit` 0 漏洞；26 文件 179 测试全过（含新增 32 项）；lint 0 error（2 既有 warning）；tsc 无错误；production build 46 页成功；本地 production server 实测 /og 四类成功、反射拒绝、非法动态参数 404（item/event/daily/topic）、metadata 调用点输出新 OG URL。
- 后端：`npm audit` 与 MCP audit 均 0 漏洞；typecheck、146 测试（含新增 9 项）、build、MCP typecheck/15 测试/build 全过。
- 两仓库 `git diff --check` 无空白错误；未引入新依赖、未写入凭据。

### 回滚（本地分支）

两仓库均未动 `main`：丢弃即 `git branch -D phase11b-p1-local`；合入后回滚则 `git revert` 对应 commit。部署前生产不受任何影响。

## 后续阶段（不在 11A/11B P1 范围）

- Vercel Firewall 路由限速规则的实际应用（待橋授权，方案见上）。
- 防爬虫策略：robots、WAF/Bot 规则、挑战、封禁与误伤监控。
- 原创正文复制限制：保留代码块、Agent 配置、链接、表单和辅助功能例外。
- 服务器 SSH、防火墙、更新、备份恢复与运行权限审计。
- CSP nonce/hash 与 Trusted Types 属于后续增强，不影响强制基线生效。

## 验收原则

- 每项规则有明确威胁模型、配置证据、命中/误伤观察和回滚方法。
- 搜索引擎、RSS、社交分享、Agent 接入、正常用户访问和可访问性没有非预期回归。
- 不在仓库、文档、日志或聊天中写入 token、Cookie、私钥、密码或其他可用凭据。
