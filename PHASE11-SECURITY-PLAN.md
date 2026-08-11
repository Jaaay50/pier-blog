# Phase 11: 网站与服务器安全加固

> 状态（2026-08-11）：**Phase 11A 已完成并上线，应用、CI/CD、生产部署与仓库治理均已复验；另一 Cloudflare 身份下仍有 1 枚 Token 保持 active，已作为既有凭据风险接受，不阻塞本阶段闭环。**

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
- 已接受的残余风险：当前登录的 Cloudflare 身份已显示“无 API 权杖”，但另一 Cloudflare 身份下仍有 1 枚已暴露 Token 经 API 验证为 active；其本地明文已删除，云端 Token 未撤销。该既有凭据风险不计入 Phase 11A 闭环阻塞范围。
- 闭环记录：文档提交 `5633dd2` 已推送；CI run `31489111025` 成功；docs-only deploy workflow `31489223884` 的 `authorize` 成功、`deploy` 按规则跳过，未产生额外生产部署。

## 回滚

### 代码与部署

1. 使用 `git revert <phase-11a-remediation-commit>` 创建可审计回滚提交并推送 main。
2. 如需立即恢复生产，使用 Vercel 回滚到变更前 deployment `dpl_6xKyLMZxVFrrQzVdwSJHDMCjc4fQ`。
3. GitHub、Vercel 与 Cloudflare 的变更前快照位于 `/Users/ethan/Documents/Codex/phase11a-remediation-backups/20260811-173537`。

### HSTS 真实回滚

浏览器会缓存 HSTS；仅在 Dashboard 关闭开关不会清除客户端已有状态。回滚必须先在受影响的 Cloudflare 代理主机上发送 `Strict-Transport-Security: max-age=0`，确认响应生效并等待客户端接收后，再禁用 HSTS。Always Use HTTPS 与 TLS 1.2 应分别按备份恢复，不与 HSTS 一次性混改。

## 后续阶段（不在 11A 范围）

- 防爬虫策略：robots、限速、WAF/Bot 规则、挑战、封禁与误伤监控。
- 原创正文复制限制：保留代码块、Agent 配置、链接、表单和辅助功能例外。
- 服务器 SSH、防火墙、更新、备份恢复与运行权限审计。
- CSP nonce/hash 与 Trusted Types 属于后续增强，不影响本次强制基线生效。

## 验收原则

- 每项规则有明确威胁模型、配置证据、命中/误伤观察和回滚方法。
- 搜索引擎、RSS、社交分享、Agent 接入、正常用户访问和可访问性没有非预期回归。
- 不在仓库、文档、日志或聊天中写入 token、Cookie、私钥、密码或其他可用凭据。
