# CLAUDE.md

本文件给代码代理提供仓库级工作说明。

@AGENTS.md

## 常用命令

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm worker
```

当前仓库未配置完整测试框架，常规校验以类型检查和 ESLint 为主。

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Prisma 7
- NextAuth v5
- LangChain
- Elasticsearch
- Redis + BullMQ
- MinIO

## 项目结构约定

### 页面目录拆分

路由目录通常按下面方式组织：

| 文件 | 作用 |
| --- | --- |
| `types.ts` | 类型定义 |
| `constants.ts` | 常量和静态配置 |
| `hooks.ts` | 页面逻辑和自定义 Hook |
| `components.tsx` | 当前路由私有组件 |
| `page.tsx` | 页面入口 |

### 路由层级

```txt
src/app/layout.tsx
src/app/page.tsx
src/app/dashboard/layout.tsx
src/app/dashboard/kb/[id]/chat/layout.tsx
src/app/dashboard/kb/[id]/chat/page.tsx
src/app/dashboard/kb/[id]/chat/[sessionId]/page.tsx
```

### `src/lib` 分组

通用工具按职责分子目录，新增文件请放到对应组里：

| 目录 | 职责 |
| --- | --- |
| `infra/` | 基础设施客户端：`prisma` / `redis` / `elasticsearch` / `minio` / `queue` / `worker` |
| `http/` | HTTP 工具：`request` / `response` / `with-auth` / `validate-request` / `validators` / `cursor-pagination` / `rate-limit` |
| `auth/` | 鉴权 / 会话 / 密码 / 验证码：`auth` / `auth.config` / `auth-callbacks` / `auth-rate-limit` / `verify-code` / `session-version` ... |
| `document/` | 文档处理 / 上传：`document-cleanup` / `document-job-guard` / `upload-route-core` ... |
| `api-key/` | 用户 API key 加密、读取、迁移：`api-key-crypto` / `get-api-key` / `zhipu-config` ... |
| `route-core/` | API 路由的可测试核心（仅当其他组不适合归类时放这里）：`chat-route-core` / `search-route-core` ... |
| `langchain/` | LangChain 抽象（已有结构） |
| `rag/` | RAG 流程：切块、嵌入、生成、摘要 |
| 根级 | 小工具：`utils` / `status-badge` / `email` / `mailer` / `web-search` |

引入方式：

- **精确路径**：`import { prisma } from '@/lib/infra/prisma'`（首选，tree-shaking 精确）
- **聚合 barrel**：仅 `infra/` 有，方便多 client 同时引入：`import { prisma, redis, esClient } from '@/lib/infra'`

## 关键实现说明

### 鉴权

- 统一基于 NextAuth
- 路由保护位于 `src/proxy.ts`

### 文档处理

- 上传接口写入对象存储
- Worker 负责解析、切块、向量化、写入索引

### 向量检索

- 使用 Elasticsearch 做向量检索
- 向量数据不存 PostgreSQL

### AI 对话

- 聊天入口：`src/app/api/chat/route.ts`
- LangChain 相关代码：`src/lib/langchain/`
- SSE 事件包括：
  - `analysis`
  - `chunk`
  - `sources`
  - `tool_call`
  - `done`

### 会话隔离

- 用户边界：`userId`
- 知识库边界：`knowledgeBaseId`
- 会话边界：`sessionId`

## 开发注意事项

- 这是 Next.js 16 项目，修改路由和运行时行为前先看官方本地文档
- 保持现有路由结构与会话隔离逻辑不变
- 优先做小范围、可验证的修改
- 涉及 AI 编排时，优先沿用现有 `LangChain` 抽象
