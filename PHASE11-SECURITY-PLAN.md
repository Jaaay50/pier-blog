# Phase 11: 网站与服务器安全加固

> 状态（2026-08-11）：**Phase 11A 已完成并上线**。防爬虫、禁复制、服务器加固属后续阶段。

## 目标与边界

- 目标是提高批量抓取、滥用和内容搬运的成本，并建立可观察、可回滚的安全基线。
- 公开网页发送到浏览器后，无法从技术上保证内容绝对不可复制；复制防护只作为普通用户层面的阻拦，不宣传为版权或数据泄露的绝对防线。
- 防爬虫必须分层处理：`robots.txt` 只约束守规矩的机器人，恶意抓取需要依靠速率限制、WAF/Bot 规则、挑战、封禁和监控。
- 安全加固不得无意破坏 SEO、RSS、Agent 接入、可访问性、正常分享、代码配置复制或 Currents 的公开只读体验。

## Phase 11A：真实安全风险修复（2026-08-11，✅ 已完成并上线）

### 已完成并部署

**代码修复**（commits `cb76739` / `2ab1432` / `43142eb`）

**Markdown 注入防护**
- 统一 `src/lib/currents/markdown.ts` 为唯一安全渲染入口，添加 `rehype-sanitize@6.0.0` 最小 schema
- 只保留段落/标题/列表/引用/代码/表格/强调/链接；拒绝 script/style/iframe/svg/form/事件属性
- 链接只允许 `http/https/mailto` 与站内相对路径；拒绝 `javascript:`/`data:`/`vbscript:` 及协议混淆
- 删除 `CurrentsReader.tsx` 重复实现；`CurrentsDetailBody.tsx` 三处 `dangerouslySetInnerHTML` 改调统一入口
- 新增 21 个注入安全测试（`<script>`/事件属性/SVG/MathML/危险协议/属性注入/GFM 回归）

**依赖安全**
- 升级 `next@16.2.12→16.3.0` + `@next/mdx@16.3.0` + `eslint-config-next@16.3.0`（修复 postcss/sharp/nanoid 传递依赖漏洞）
- 增加 `js-yaml@^4.1.0`（修复 CVE-2026-59870），overrides 强制 gray-matter 使用 4.x 安全 API
- `src/lib/posts.ts` 自定义 gray-matter engine 调用 `js-yaml.load`（默认安全模式）
- `engines.node="22.x"` 统一 Node 版本
- 增加 `rehype-sanitize@6.0.0`
- `npm audit --omit=dev`: **0 漏洞**（was 5 high）

**安全响应头**
- `next.config.mjs` 增加全站响应头：X-Content-Type-Options/Referrer-Policy/Permissions-Policy/X-Frame-Options
- CSP **Report-Only** 模式（观察违规不阻断），包含 ParticleGate/主题脚本/Giscus/Currents API 白名单

**供应链加固**
- `.github/workflows/deploy.yml`：
  - Actions 固定完整 SHA（checkout v5.0.0 + setup-node v5.0.0）
  - Vercel CLI 固定 `58.9.1`（不再 `@latest`）
  - `npm install` → `npm ci --legacy-peer-deps`（只读安装，遵守 lockfile）
  - 部署前依次执行 `npm audit --omit=dev` / `npm test` / `npm run lint` / `npx tsc --noEmit`
  - `permissions: contents: read`（最小权限）
  - `concurrency: production-deploy`（防止并发生产部署）

**Cloudflare 传输安全**
- ✅ Always Use HTTPS 已开启（HTTP→HTTPS 301 跳转）
- ✅ HSTS 已启用（max-age=31536000 / includeSubDomains=true / preload=false / nosniff=true）
- ✅ TLS 最低版本 1.2
- 验证：`http://currents-api.ethanpier.com/health` → 301，`http://currents-mcp.ethanpier.com/mcp` → 301
- 验证：HTTPS 响应头包含 `strict-transport-security: max-age=31536000; includeSubDomains`
- 验证：TLS 1.1 连接被拒绝，TLS 1.2 正常

**GitHub Dependabot**
- ✅ Vulnerability alerts 已启用
- ✅ Security updates 已启用

### 生产验证（2026-08-11 08:55 +08）

**主站**
- ✅ 所有主要路由 200：/zh /en /zh/blog /en/blog /zh/about /zh/portfolio /zh/lab /zh/currents /zh/currents/agent /zh/feedback /feed.xml /feed-zh.xml /sitemap.xml
- ✅ 安全响应头全部生效：X-Content-Type-Options / Referrer-Policy / Permissions-Policy / X-Frame-Options / CSP Report-Only / HSTS（Vercel 默认）
- ✅ Currents 页面脚本来源全部来自 `/_next/static/chunks/`（无注入）

**API/MCP**
- ✅ HTTP→HTTPS 301 跳转（Location 头正确）
- ✅ HTTPS 响应包含 HSTS（max-age=31536000; includeSubDomains）
- ✅ HTTPS API health 200（正常业务响应）
- ✅ HTTPS MCP 无凭据 401（鉴权正常）
- ✅ TLS 1.1 拒绝连接，TLS 1.2 正常

**GitHub Actions**
- ✅ Run `31473747159` 成功（audit/test/lint/tsc/build/deploy 全链路）
- ✅ 部署至 Vercel production

### 待完成（非阻断）

**GitHub Actions 权限限制**（Dashboard 手动）
- Settings → Actions → General → 选择 "Allow enterprise, and select..." + SHA pinning
- Workflow permissions → "Read repository contents"

**GitHub main 分支保护**（Dashboard 手动）
- Settings → Rules → New ruleset → `main-protection`
- 要求 status checks、禁止 force push、禁止删除

**Vercel Deployment Checks**（可选）
- Settings → Deployment Checks → Add "GitHub Actions" check

### 后续阶段（不在 11A 范围）
- 观察 CSP Report-Only 违规日志（7 天后决定是否切换为强制模式）
- 防爬虫策略（robots.txt/速率限制/WAF 规则）
- 禁复制（页面选择/右键限制）
- 服务器 SSH/防火墙加固

### 回滚方法

**代码回滚**
```bash
cd /Users/ethan/Documents/pier-blog
git revert 43142eb 2ab1432 cb76739
git push origin main
```

**Cloudflare 回滚**
```bash
export CF_API_TOKEN="CF_API_TOKEN"
export ZONE_ID="ZONE_ID"

# 关闭 Always Use HTTPS
curl -sS -X PATCH -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"off"}' \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https"

# 禁用 HSTS
curl -sS -X PATCH -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":{"strict_transport_security":{"enabled":false}}}' \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/security_header"

# 恢复 TLS 版本（查看备份 /Users/ethan/Documents/Codex/phase11a-backups/20260811-160601/cloudflare-tls-before.json）
```

**GitHub Dependabot 回滚**
- Dashboard → Settings → Code security and analysis → 关闭 Dependabot alerts 和 security updates


### 已完成（本地 commit cb76739）

**Markdown 注入防护**
- 统一 `src/lib/currents/markdown.ts` 为唯一安全渲染入口，添加 `rehype-sanitize` 最小 schema
- 只保留段落/标题/列表/引用/代码/表格/强调/链接；拒绝 script/style/iframe/svg/form/事件属性
- 链接只允许 `http/https/mailto` 与站内相对路径；拒绝 `javascript:`/`data:`/`vbscript:` 及协议混淆
- 删除 `CurrentsReader.tsx` 重复实现；`CurrentsDetailBody.tsx` 三处 `dangerouslySetInnerHTML` 改调统一入口
- 新增 21 个注入安全测试（`<script>`/事件属性/SVG/MathML/危险协议/属性注入/GFM 回归）

**依赖安全**
- 升级 `next@16.2.12→16.3.0` + `@next/mdx@16.3.0` + `eslint-config-next@16.3.0`（修复 postcss/sharp/nanoid 传递依赖漏洞）
- 增加 `js-yaml@^4.1.0`（修复 CVE-2026-59870），overrides 强制 gray-matter 使用 4.x 安全 API
- `src/lib/posts.ts` 自定义 gray-matter engine 调用 `js-yaml.load`（默认安全模式）
- `engines.node="22.x"` 统一 Node 版本
- 增加 `rehype-sanitize@6.0.0`
- `npm audit --omit=dev`: 0 漏洞（was 5 high）

**安全响应头**
- `next.config.mjs` 增加全站响应头：X-Content-Type-Options/Referrer-Policy/Permissions-Policy/X-Frame-Options
- CSP **Report-Only** 模式（观察违规不阻断），包含 ParticleGate/主题脚本/Giscus/Currents API 白名单

**供应链加固**
- `.github/workflows/deploy.yml`：
  - Actions 固定完整 SHA（checkout v5.0.0 + setup-node v5.0.0）
  - Vercel CLI 固定 `58.9.1`（不再 `@latest`）
  - `npm install` → `npm ci`（只读安装，遵守 lockfile）
  - 部署前依次执行 `npm audit --omit=dev` / `npm test` / `npm run lint` / `npx tsc --noEmit`
  - `permissions: contents: read`（最小权限）
  - `concurrency: production-deploy`（防止并发生产部署）

**本地验证**
- `npm test`: 133/133（新增 21 个 Markdown 注入测试）
- `npm run lint`: 0 error（2 个既有 warning）
- `npx tsc --noEmit`: 通过
- `npm run build`: 全静态（44 页 SSG/SSR）
- `npm audit --omit=dev`: 0 漏洞
- `git diff --check`: 无尾随空白

### 待外部确认（一次性清单）

详细计划见 `/Users/ethan/Documents/Codex/phase11a-backups/20260811-160601/EXTERNAL-CHANGES-PLAN.md`

**Cloudflare**（需要 CF_API_TOKEN 或 Dashboard 操作）
- 开启 Always Use HTTPS（`currents-api.ethanpier.com` 与 `currents-mcp.ethanpier.com` HTTP→HTTPS 301 跳转）
- 增加 HSTS（max-age=31536000，includeSubDomains=true，preload=false）
- 设置 TLS 最低版本 1.2

**GitHub**
- 启用 Dependabot vulnerability alerts 与 security updates
- 限制 Actions 权限（`allowed_actions: selected` + `sha_pinning_required: true`）
- 创建 production Environment（可选移动 Secrets）
- 保护 main 分支（要求 CI 通过）

**Vercel**（可选）
- 添加 Deployment Checks（要求 GitHub Actions 成功）

**Push 与验证**
- `git push origin main` 触发部署
- 验证主站安全头、HTTP→HTTPS、Giscus、Currents 渲染、所有路由 200

### 后续阶段（不在 11A 范围）
- 观察 CSP Report-Only 违规日志，决定是否切换为强制模式
- 防爬虫策略（robots.txt/速率限制/WAF 规则）
- 禁复制（页面选择/右键限制）
- 服务器 SSH/防火墙加固


## 决策顺序

### 1. 防爬虫

需要逐项确认：

- **允许对象**：是否继续允许 Google/Bing 等搜索引擎、RSS 阅读器、社交预览、AI 搜索/训练机器人和站点监控。
- **保护范围**：博客正文、Currents 列表与详情、搜索索引、RSS、公开 JSON/API 是否采用不同策略。
- **处置强度**：仅记录和限速，还是对异常流量返回 `429`、Managed Challenge 或直接封禁。
- **识别信号**：请求速率、并发、路径遍历、User-Agent、IP/ASN、无浏览器行为、重复抓取和诱饵路径；不得只依赖可伪造的 User-Agent。
- **基础设施落点**：优先评估现有 Cloudflare/Vercel 原生能力，再判断是否需要应用层限流；避免为简单规则新增维护型依赖。
- **观察与回滚**：先收集基线并采用可撤销规则，记录命中量、误伤、状态码和回滚方式。

推荐但尚未确认的默认方向：保留主流搜索引擎和正常 RSS/社交预览；对高频批量抓取采用分级限速与挑战，而不是一开始全站封锁。

### 2. 禁用复制

需要逐项确认：

- **覆盖页面**：只限制博客正文，还是 Currents、About、Portfolio 等公开页面也限制。
- **允许例外**：代码块、Agent 配置、命令、邮箱、链接、表单输入和无障碍辅助功能是否继续允许复制。
- **交互强度**：仅禁止文本选择；同时拦截 `copy`/右键；或显示版权提示与来源链接。
- **移动端行为**：是否阻止长按选择，以及由此带来的词典、翻译和辅助功能损失。
- **降级原则**：不采用 Canvas 全文、图片化正文、加密前端数据或重度混淆；这些方案会损害 SEO、可访问性和性能，仍无法阻止截图、DevTools 或直接请求 HTML。

推荐但尚未确认的默认方向：只对原创长文正文做轻量限制，保留代码块、配置示例、链接、表单和 Agent 页面复制能力，并提供版权提示；不做全站无差别禁用。

### 3. 其他网站安全基线

- 安全响应头：CSP、HSTS、`X-Content-Type-Options`、Referrer Policy、Permissions Policy、frame 防护。
- 输入与输出边界：反馈表单、搜索、MDX、JSON-LD、外链协议和富文本渲染的 XSS/注入检查。
- 依赖与供应链：锁文件、Dependabot/审计策略、GitHub Actions 固定版本与最小权限。
- 隐私与滥用：日志最小化、表单限流、honeypot、数据保留周期和错误信息边界。
- 可用性：缓存、错误页、监控、告警、构建与部署回滚；防护规则不能成为新的单点故障。

### 4. 服务器安全审计（网站阶段之后）

- 先只读盘点真实服务器、开放端口、云防火墙/UFW、SSH 生效配置、系统版本、更新状态和运行服务。
- 再决策 root 登录、密码登录、端口转发、Fail2Ban/sshguard、最小权限用户、自动安全更新、日志与告警。
- 核验备份可恢复性、密钥与 Secret 存放、Docker/Nginx 权限和灾难恢复；不以“有备份文件”代替恢复演练。
- 所有可能影响远程连接或生产流量的规则必须保留当前会话、准备回滚路径并分步验证，避免把自己锁在服务器外。

## 阶段交付顺序

1. 对齐防爬虫的允许对象、保护范围和处置强度。
2. 对齐复制限制的页面范围、例外和交互强度。
3. 盘点现有网站安全头、Cloudflare/Vercel 能力、公开接口和日志基线。
4. 输出实施批次、影响面、回滚方式与验收标准，确认后再修改。
5. 网站阶段完成后，另行启动服务器只读安全审计和加固决策。

## 验收原则

- 每项规则有明确威胁模型、配置证据、命中/误伤观察和回滚方法。
- 搜索引擎、RSS、社交分享、Agent 接入、正常用户访问和可访问性没有非预期回归。
- 复制限制按已确认范围生效，代码块和配置示例等例外保持可用。
- 不在仓库、文档、日志或聊天中写入 token、Cookie、私钥、密码或其他可用凭证。
