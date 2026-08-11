# Phase 11: 网站与服务器安全加固

> 状态（2026-08-11）：**Phase 11A 修复已完成，等待本次 main CI 与生产部署复验**。只有代码、CI、外部设置和线上行为全部通过后才标记上线完成。

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
- `production` Environment 只允许 `main`，Vercel 三项 Secret 已复制到 Environment；仓库级副本在新部署通过后删除。
- 前端与后端/MCP 均加入 Dependabot 配置；后端和 MCP 各自持续执行标准安装、生产依赖 audit、类型检查、测试与构建。
- main ruleset 在新 CI 首次成功后启用，避免在 required check 尚不存在时锁死发布。

### Cloudflare 与传输安全

- 已在 Cloudflare Dashboard 盘点完整 DNS：仅 4 条记录；`currents-api` 与 `currents-mcp` 为代理 Tunnel，根域与 `www` 为 DNS-only Vercel CNAME。
- Always Use HTTPS 保持开启，TLS 最低版本保持 1.2，TLS 1.3 保持开启。
- HSTS 保持 `max-age=31536000`、`preload=false`、`nosniff=true`，并将 `includeSubDomains` 调整为 `false`，避免把未来未知子域纳入不可逆缓存范围。
- Cloudflare 设置与 DNS 盘点备份位于 `/Users/ethan/Documents/Codex/phase11a-remediation-backups/20260811-173537/external/cloudflare`。

### 验收状态

- 本地产品验证：待在最终提交上记录标准 `npm ci`、完整 audit、tests、lint、TypeScript、Next build、Vercel CLI/build 和 workflow lint 结果。
- 线上验证：待记录 GitHub Actions run、Vercel deployment、主要路由、安全头、CSP/Giscus/主题/Canvas、API/MCP、HTTP 跳转和 TLS 结果。
- 凭据处置：所有外部设置完成后撤销暴露过的 Cloudflare Token，脱敏本地会话并清理 Git reflog/不可达对象，再复验本地与远端不存在 Token 前缀。

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
