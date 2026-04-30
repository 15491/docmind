# 🧠 DocMind — AI 知识库问答系统

一个基于 RAG（检索增强生成）的私有文档问答系统。上传任意文档，获得精准的 AI 回答，所有答案都有引用溯源。

**核心价值：** 告别 AI 幻觉，让 AI 只基于你的文档回答问题。

---

## 📋 快速导航

### 项目文档

| 文档 | 说明 |
|------|------|
| **[PROJECT.md](./PROJECT.md)** | 项目完整需求分析、架构设计、数据模型 |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 前端页面结构、路由设计、交互流程 |
| **[API_IMPLEMENTATION.md](./API_IMPLEMENTATION.md)** | 核心3个API的实现方案（代码示例 + 逻辑详解）⭐ |
| **[DEV_PROGRESS.md](./DEV_PROGRESS.md)** | 开发进度跟踪、本周计划、常见问题 |

### 核心API

- **[`POST /api/upload`](./API_IMPLEMENTATION.md#二api-1-post-apiupload--文件上传)** — 上传文档，触发异步处理
- **[`POST /api/chat`](./API_IMPLEMENTATION.md#三api-2-post-apichat--sse-流式问答)** — SSE 流式问答
- **[`GET /api/documents/status`](./API_IMPLEMENTATION.md#四api-3-get-apidocumentsstatus--文档处理状态)** — 查询文档处理状态

---

## 🚀 快速开始

### 1️⃣ 环境准备

```bash
# 克隆项目
git clone <repo-url>
cd docmind

# 安装依赖
npm install

# 环境变量配置
# 编辑 .env.local，填入以下信息：
# - DATABASE_URL （PostgreSQL + pgvector）
# - REDIS_URL （Redis）
# - NEXTAUTH_SECRET & NEXTAUTH_URL
# - ZHIPU_API_KEY （智谱AI - 从 https://open.bigmodel.cn/ 获取）
```

### 获取 Zhipu AI API Key

1. 访问 https://open.bigmodel.cn/
2. 注册账户并完成实名认证
3. 进入「API Key 管理」创建新的 API Key
4. 充值账户余额（建议 50-100 元作为初始额度）
5. 将 API Key 添加到 `.env.local`：
```env
ZHIPU_API_KEY="sk-你的api-key"
```

### 2️⃣ 数据库初始化

```bash
# 执行 Prisma migrations
pnpm prisma migrate dev

# 生成 Prisma Client
pnpm prisma generate
```

### 3️⃣ 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可看到项目。

---

## 📊 项目进度

### 当前阶段：✅ 核心功能完整（100%）

```
✅ 已完成（100%）
├─ 项目规划 & 架构设计
├─ 前端 UI 搭建
├─ 数据模型 & 数据库配置
├─ 所有 MOCK 数据已清理
├─ 9 个 API 端点全部实现
├─ 10 个自定义 hooks 完整实现
├─ 字段名称映射一致
├─ Next.js 15 API 路由更新
├─ Zhipu AI 集成完成
└─ 测试通过 ✓ Dev 服务器正常启动
```

### ✅ 最新更新 (2026年5月)

- ✅ 清理所有 MOCK 数据常量，使用真实 API
- ✅ 实现完整的 RAG Pipeline
- ✅ 修复所有字段名称不一致问题
- ✅ 更新 Next.js 15 API 路由参数格式
- ✅ 完成 Zhipu AI 集成和配置

### 下一步计划

- [ ] 性能优化和缓存策略
- [ ] 权限控制和多用户隔离
- [ ] 对话历史优化和上下文管理
- [ ] 日志系统和监控面板

详见 [`DEV_PROGRESS.md`](./DEV_PROGRESS.md)

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Next.js 16 + React 19 | App Router + Server Components |
| **语言** | TypeScript | 类型安全 |
| **样式** | Tailwind CSS + shadcn/ui | 高效开发 |
| **数据库** | PostgreSQL + pgvector | 向量存储 + ORM (Prisma) |
| **缓存/队列** | Redis + BullMQ | 异步处理大文件 |
| **认证** | NextAuth.js | GitHub OAuth |
| **AI** | 智谱AI | GLM-4-Flash + Embedding API |
| **部署** | Railway | Node.js + Redis + PostgreSQL |

---

## 📚 核心功能

### MVP（最小可行产品）

- ✅ 文档上传（PDF / Markdown / TXT）
- ✅ 自动解析 + 向量化
- ✅ 语义检索（Top-5）
- ✅ SSE 流式问答
- ✅ 引用溯源
- ✅ 对话历史

### 扩展功能（计划中）

- 🔄 Agent 编排系统 （多Agent协作）
- 🔄 MCP 工具系统 （扩展工具）
- 🔄 多轮对话优化
- 🔄 知识库分享

详见 [`PROJECT.md` 第十二章](./PROJECT.md#十二未来升级路线分阶段)

---

## 🎯 简历亮点

> 独立设计并实现完整 RAG Pipeline：
> - 文档解析 → 语义分块 → Embedding 向量化 → pgvector 检索 → Prompt 拼装 → GLM API 流式生成
> - 基于 Next.js 16 App Router 构建，SSE 流式输出，首 Token 响应 < 1s
> - 改用 PostgreSQL pgvector 替代独立向量数据库，零额外服务依赖
> - 引用溯源功能，有效解决 AI 幻觉问题
> - BullMQ 异步队列处理大文件，上传接口响应 < 500ms

---

## 🔗 相关链接

- [Prisma 数据模型](./PROJECT.md#六数据模型)
- [前端页面设计](./ARCHITECTURE.md)
- [API 实现指南](./API_IMPLEMENTATION.md) ⭐
- [开发进度与计划](./DEV_PROGRESS.md)

---

## 💡 常见问题

**Q: 如何测试 API？**  
A: 见 [`DEV_PROGRESS.md` 第五章](./DEV_PROGRESS.md#五常见问题与解决方案)

**Q: 如何部署到生产环境？**  
A: 见 [`DEV_PROGRESS.md` 第六章](./DEV_PROGRESS.md#六部署检查清单)

**Q: 向量数据库如何工作？**  
A: 见 [`API_IMPLEMENTATION.md` 第三章](./API_IMPLEMENTATION.md#三api-2-post-apichat--sse-流式问答)

---

## 📝 文档版本

| 文档 | 版本 | 更新日期 |
|------|------|---------|
| README.md | v1.0 | 2026-04-30 |
| PROJECT.md | v2.0 | 2026-04-30 |
| ARCHITECTURE.md | v2.0 | 2026-04-30 |
| API_IMPLEMENTATION.md | v1.0 | 2026-04-30 |
| DEV_PROGRESS.md | v1.0 | 2026-04-30 |

---

🚀 **Ready to build the future of private document AI!**
