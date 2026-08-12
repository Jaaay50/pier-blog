# Phase 11: 网站与服务器安全加固

> 状态（2026-08-12）：**Phase 11A 与 Phase 11B P1 已完成并通过生产验收；Phase 11C P1（Vercel Firewall 边缘限流）已生效并完成当前可行验收，结论为有保留通过：CSP 规则已完成 429 闭环，OG 规则因 Vercel Security Checkpoint 先行挑战而尚未独立观测到自身 429。防爬虫、复制限制、服务器 SSH/防火墙专项审计及 CSP nonce/hash/Trusted Types 仍属于后续独立阶段。此前另一 Cloudflare 身份下的 1 枚残留 Token 橋已撤销，本任务未复验。**

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

## Phase 11B P1：生产闭环（2026-08-11–12，已完成）

> 状态边界：前端 PR #11 与后端 PR #13 已合入 `main`，GitHub CI、Vercel 生产部署、后端镜像切换及独立后置验收全部通过。Cloudflare 残留 Token：橋已撤销，本任务未复验；Vercel Firewall 未纳入本阶段。

### 1. Vercel Secret 作用域收窄（前端）

- `deploy.yml` 不再在 GitHub runner 执行本地 `vercel pull/build`：依赖安装固定为 `npm ci --ignore-scripts`，只读取 package metadata 验证 lockfile 中的 Vercel CLI `58.9.1`，最后一步才注入 `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` / `VERCEL_TOKEN`，由 `vercel deploy --prod` 上传同一 SHA 源码并在 Vercel 远端构建。
- 这样既不让 npm lifecycle/项目构建直接读取 GitHub Environment 部署凭据，也阻断无凭据步骤通过 `GITHUB_ENV` / `GITHUB_PATH` 污染后续鉴权进程；唯一鉴权步骤固定为 deploy job 最后一步。
- `src/workflow-secrets.test.ts` 对完整 YAML 字段扫描 dot/bracket/dynamic Secret 引用并校验同名映射；workflow env 只允许固定 npm 版本，job env/defaults/container 禁止；deploy 前置步骤完整对象、Vercel 命令和最终 Secret 集合均精确锁定，任何本地 pull/build、`--prebuilt`、额外 shell/env/步骤都会失败。零新依赖，复用既有 js-yaml。

### 2. Currents 全局读取限流键（后端）

- `src/utils/client-ip.ts`：`resolveClientIp` 仅默认信任 loopback；其余代理必须通过 `TRUSTED_PROXY_IP` 配置精确 IP 白名单。配置缺失时 fail closed，不再默认信任 RFC1918/ULA 私网。
- 新增 `src/utils/ip-address.ts` 统一规范 IPv4-mapped IPv6、展开/大小写不同但等价的 IPv6；配置值、直连代理地址和合法 `CF-Connecting-IP` 使用同一规范形式，避免可信代理匹配失败或等价 IPv6 拆分限流桶。带 scope 的 IPv6 无法可靠规范时明确拒绝，不抛出未受控异常。
- 全局 `@fastify/rate-limit` 接入 `keyGenerator: resolveClientIp`（修复前所有访客共享代理网关同一桶）；反馈路由删除重复的 `clientKey`，改用同一函数。
- `tests/events/rate-limit-key.test.ts` 当前 16 项：覆盖同 IP 429、62 个客户端独立桶、非法/多值/超长头回落、非可信直连伪造头不可绕过、可信代理等价地址匹配，以及等价 IPv6 客户端文本归并到同一限流桶。
- **生产硬门禁**：部署前必须只读核验 Cloudflare Tunnel / Docker 到 API 容器的真实直连源地址，并将真实值写入 `TRUSTED_PROXY_IP` 后再构建镜像；不得猜测。漏配会安全回落到代理地址，但会让访客再次共享同一桶。

### 3. /api/csp-report 日志护栏（前端）

- 新增 `report-guard.ts`：零依赖、内存有界的 TTL 指纹去重（同指纹 10 分钟记一次，指纹表上限 2048 条、超限淘汰最旧）+ 每实例滚动窗口日志预算（5 分钟 60 条，耗尽只停日志不改响应）；新窗口输出上一窗口抑制汇总。
- 指纹只取已清洗字段（documentUrl/directive/blockedUrl/sourceFile），不记录 IP、query、fragment、script sample 或原始 payload；既有 204/400/403/413/415 行为与清洗边界不变，合法报告永远 204。
- **明确边界：这是每 Serverless 实例的进程内护栏，不是 Vercel 平台级/全局限流**；平台级限速已由下方「Vercel Firewall 路由限速（已由 Phase 11C P1 落地）」实现。
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
- 动态 sitemap 保持 shard 白名单、10s 超时、503+no-store 与成功缓存语义；新增非空 query 拒绝，任何 `?nonce=` 等缓存绕过请求直接 400+no-store 且零上游 fetch。route 层 8 项覆盖未知分片、故障、成功缓存与 query 边界。
- 日报错误边界复用父级 Currents layout，移除重复 `main` / Navbar / Footer；保留可重试按钮，补 `role="alert"`、键盘焦点样式及组件测试。

### 6. MCP 上游响应生命周期（后端）

- `CurrentsClient.get` 的内部超时现在覆盖 fetch、状态映射、完整响应 body 读取与 schema 校验；响应头先返回但 body 挂起时仍会在预算内中止并映射为受控 `timeout`。
- 非 2xx 响应在抛出稳定错误码前主动取消 body，避免持续 429/5xx 占用连接与响应流；取消失败被吞并，不会覆盖原始 `rate_limited` / `unavailable` 等映射。
- MCP 协议测试当前 17 项，新增完整 body 超时和非成功 body 取消/取消失败回归。

### Vercel Firewall 路由限速（已由 Phase 11C P1 落地）

进程内护栏无法限制平台层请求量；平台级限速已于 2026-08-12 作为 Phase 11C P1 应用，见下方「Phase 11C P1」章节。

### 验收（本地、CI 与生产，2026-08-12）

- 代码与 CI：前端 PR #11 已 squash 合入 `9b3073dbc6a27ad43db9984844306b548b382de2`，main CI run `31550885348` 成功；后端 PR #13 已 squash 合入 `dfe1de4e461159d61761038077962364fc257e66`，main CI run `31549360675` 成功。
- 本地门禁：前端在 Node `22.23.1` / npm `10.9.8` 下完成 fresh `npm ci`、完整 audit 0、27 文件 200 测试、lint 0 error（2 个既有 warning）、TypeScript 与 46 页 production build；后端完成 audit 0、typecheck、153 测试和 build，MCP 完成 audit 0、typecheck、17 测试和 build。两轮只读交叉复核均无 P1/P2 阻塞。
- 恢复与回滚门禁：腾讯云快照 `lhsnap-cnxu5i7j` 正常，TAT 探针返回 `phase11b-tat-ok`，SSH 可用；部署前回滚包 `/opt/currents/backups/pre-phase11b-p1-20260811T165734Z` 状态 `COMPLETE`、22 个文件、SHA256 清单与 SQLite `quick_check` 均通过。
- 后端生产：真实代理源地址核验为 `172.18.0.1`，生产配置写入 `TRUSTED_PROXY_IP=172.18.0.1`；应用目录 `/opt/currents/app-phase11b-p1-27fb414`，API 镜像 `sha256:f5ef791ae5148b1d91c6666423a8bcde775c2a9098e2bf71cf643606fa6a5044`，MCP 镜像 `sha256:4766cbaa5535ca640e8caf4b282d8ed45ac95f3ce4bfc0d0e5f3c968582f2a10`。
- 后端独立后置验收 `POSTFLIGHT=PASS`：API/MCP healthy、restart `0`、OOM `false`；独立访客限流桶、伪造头回落、反馈限流与 MCP 鉴权初始化/五工具真实调用通过；SQLite `quick_check` / `foreign_key_check`、cron、Tunnel、SSH、x-ui、Xray、Hysteria2 及 80/443/8788/8789 监听无回归；公网 API 为 200、未授权 MCP 为 401。
- 前端生产：初次 run `31550966375` 因旧 `VERCEL_TOKEN` 无效失败；`production` Environment 已换成新建的长期 Vercel Token（未记录明文），同一 run 重试成功。deployment `dpl_7tVq7nSSGran2dZbcDdUSz8ZutJM`（`pier-blog-hatwejen8-jia-ethans-projects.vercel.app`）为 `READY`、target 为 production、Git SHA 为 `9b3073d`，并 alias 到 `ethanpier.com`、`www.ethanpier.com` 与稳定 Vercel 域名。
- 前端线上回归：主页、Currents 列表、资讯详情、事件详情、日报与主题页均为 200；`/og` 的 site/blog/item/event 四类请求均返回有效 PNG，旧式任意文案参数返回 400 + `no-store`，未知资源返回 404 + `no-store`。Cloudflare Token 撤销状态未复验，Vercel Firewall 未应用。

### 回滚（生产）

1. 代码回滚使用 `git revert 9b3073dbc6a27ad43db9984844306b548b382de2` 与 `git revert dfe1de4e461159d61761038077962364fc257e66` 创建可审计提交，不改写历史。
2. 前端紧急回滚可将 production alias 恢复到 Phase 11A deployment `dpl_GyeRS81zD6QPxZmfYb1FwxHGZ44X`；同时保留当前 deployment ID 便于再次切回。
3. 后端按 `/opt/currents/backups/pre-phase11b-p1-20260811T165734Z/ROLLBACK.txt` 恢复部署前 compose、环境与保留镜像；必要时以腾讯云快照 `lhsnap-cnxu5i7j`、TAT 或 SSH 作为独立恢复通道。本阶段无数据库 migration。

## Phase 11C P1：边缘层请求防滥用（Vercel Firewall 限速，2026-08-12，有保留通过）

> 状态边界：只新增两条 Vercel WAF Rate Limit 规则，零代码变更、零部署；不涉及服务器 P2、Cloudflare、防爬虫、复制限制、CSP nonce/Trusted Types。变更前 Firewall 自定义规则为 0，无既有规则受影响。两条规则均已 active/valid，但严格验收仍保留 OG 规则自身 429 未独立实证的缺口。

### 生效规则（config `waf_tbMqVg9FWDdr` version 3，2026-08-12T01:40:34Z UTC 生效）

| 规则名 | 规则 ID | 条件 | 限流 | 超限 | 状态 |
|---|---|---|---|---|---|
| `phase11c-csp-report-rate-limit` | `rule_phase11c_csp_report_rate_limit_QMtmpG` | path eq `/api/csp-report` AND method eq `POST` | 60 req / 60s / IP，fixed window | 平台默认 429 | active / valid |
| `phase11c-og-rate-limit` | `rule_phase11c_og_rate_limit_BTtjQi` | path starts with `/og` | 120 req / 60s / IP，fixed window | 平台默认 429 | active / valid |

### 套餐能力实测（Hobby）

- 官方文档：WAF Rate Limiting 全套餐可用；Hobby 限 **1 条 Rate Limit 规则/项目**、最多 3 条自定义规则、fixed window、IP/JA4 键、含 100 万请求配额。
- API 实测行为：从 0 规则状态**一次原子 PUT 两条 RL 规则**被接受（200）；但已存在 RL 规则时再次 PUT（修改/重建）会被 `403 Rate limiting is not available for this plan` 拒绝。因此两条规则当前同时生效，但**后续任何规则修改都需先 PUT 空规则再从零重建**（重建 payload 已存备份目录），且不能排除 Vercel 未来收紧此行为到严格 1 条。
- 过程中的中间态：首次 PUT（超限 action=`deny`）实测超限返回 403 而非 429，已整体回滚（version 2 空规则，基线复验 204/200 正常）后改用省略超限 action 字段（=平台默认 429）重建为 version 3。

### 生产验证（2026-08-12，本机单 IP 有界测试）

- **CSP 规则 429 实证**：同一合法无敏感信息样本，探针 1 + 脉冲 64 = 65（阈值+5，并发 4），结果精确 **60×204 → 5×429**，fixed window 以首请求锚定；窗口后恢复 204。
- **OG 规则**：实际执行了两轮，每轮 125 次（累计 250 次，超出原验收约束的总量上限）。第一轮为 20×200 PNG + 105×403，第二轮为 19×200 PNG + 106×403；403 均带 `x-vercel-mitigated: challenge`，属于**平台级异常流量挑战**，并一度影响测试 IP 的全部路径（含 `/zh`），约 8–10 分钟后自然衰减。这不是本规则的 429 动作；**OG 规则自身的 429 行为未能直接观测**。同构造、同平台默认动作的 CSP 规则可作为间接语义证据，但不替代 OG 自身的严格验收。为避免再次触发全路径挑战，不再进行高频 OG 压测。
- **恢复与回归**（10:15 +08）：挑战衰减后 CSP 204、OG 200 PNG（106855B）；`/zh` `/en` Currents 列表/资讯详情/事件页/日报/主题列表/主题详情/blog/portfolio/lab/about 共 13 路由全 200；API `/health` 200；MCP 未授权 401。
- **误伤边界**：测试 IP 自身曾触发全路径平台挑战并已自行衰减；在本次单 IP、13 条核心路由的有限回归样本中未观察到其他误伤，因此当前无需禁用规则。

### 备份与回滚

- 变更前/后/最终配置快照、重建 payload、脉冲结果与脱敏挑战证据：`/Users/ethan/Documents/Codex/phase11c-firewall-backups/20260812-092251/`（`firewall-config-before.json` 确认变更前为空配置）。该目录仅作本地证据，已移除与验收无关的项目/账户/OIDC 元数据并收紧为目录 `700`、文件 `600`；不得直接对外分发或纳入 Git。
- 回滚：Dashboard Firewall 规则列表直接 Disable/Delete，或 API `PUT /v1/security/firewall/config` 提交 `{"firewallEnabled":true,"ips":[],"rules":[]}`，即时生效、无部署依赖、无状态残留（本次任务中已实际演练一次并验证基线恢复）。注意回滚后重建需从零一次性 PUT（见套餐能力实测）。

## 后续阶段（不在 11A/11B P1/11C P1 范围）

- 防爬虫策略：robots、WAF/Bot 规则、挑战、封禁与误伤监控。
- 原创正文复制限制：保留代码块、Agent 配置、链接、表单和辅助功能例外。
- 服务器 SSH、防火墙、更新、备份恢复与运行权限审计。
- CSP nonce/hash 与 Trusted Types 属于后续增强，不影响强制基线生效。

## 验收原则

- 每项规则有明确威胁模型、配置证据、命中/误伤观察和回滚方法。
- 搜索引擎、RSS、社交分享、Agent 接入、正常用户访问和可访问性没有非预期回归。
- 不在仓库、文档、日志或聊天中写入 token、Cookie、私钥、密码或其他可用凭据。
