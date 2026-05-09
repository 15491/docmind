# DocMind

一个面向私有文档问答的 AI 知识库项目。用户上传文档后，系统会完成解析、切块、向量索引，并在对话时基于知识库内容生成带来源引用的回答；必要时可自动触发联网搜索补充信息。

## 项目定位

- 面向个人学习、团队内部知识沉淀、产品文档问答
- 支持多知识库、多会话、用户级会话隔离
- 当前已接入 `LangChain`，适合继续向“研究助手”方向演进

## 核心能力

- 文档上传：支持 `PDF`、`Markdown`、`TXT`
- 异步处理：上传后进入队列，由 Worker 完成解析与索引
- RAG 检索：基于 Elasticsearch 向量检索返回相关文档片段
- AI 对话：SSE 流式输出，支持多轮会话
- 结构化回答：返回 `answer / evidence / confidence / followUp`
- 联网补充：在知识库证据不足时自动触发 Web Search
- 会话管理：支持新建会话、历史会话列表、会话摘要压缩
- 权限隔离：按 `userId / kbId / sessionId` 做访问边界控制

## 技术栈

| 类别 | 方案 |
| --- | --- |
| 前端 | Next.js 16、React 19、TypeScript 5 |
| UI | Tailwind CSS 4、shadcn/ui、Lucide |
| 鉴权 | NextAuth v5 |
| 数据库 | PostgreSQL、Prisma 7 |
| 队列 | Redis、BullMQ |
| 对象存储 | MinIO |
| 向量检索 | Elasticsearch |
| LLM 编排 | LangChain |
| 模型接入 | `@langchain/openai`，OpenAI 兼容模式接入智谱 |
| 邮件 | Resend |
| 联网搜索 | Tavily（可选） |

## 当前 AI 架构

### 对话链路

1. 用户发起问题到 `POST /api/chat`
2. 根据 `kbId` 调用 `KnowledgeBaseRetriever`
3. 路由链判断使用：
   - `kb_only`：只基于知识库回答
   - `kb_web`：知识库 + 联网补充
4. 使用结构化回答链生成：
   - 最终回答
   - 关键证据
   - 置信度
   - 建议追问
5. 通过 SSE 推送 `analysis / chunk / sources / done`

### 会话隔离

- 不同用户的数据通过 `knowledgeBase.userId` 做隔离
- 不同知识库通过 `knowledgeBaseId` 做隔离
- 不同会话通过 `sessionId` 做隔离
- 聊天接口会校验：
  - 知识库是否存在
  - 当前用户是否拥有该知识库
  - 当前会话是否属于该知识库

## 目录结构

```txt
src/
  app/
    api/                 API 路由
    dashboard/           控制台页面
  lib/
    langchain/           LangChain 模型、链、工具、Retriever
    rag/                 文档切块、摘要、流式生成
    web-search.ts        联网搜索
  worker-process.ts      文档处理 Worker 入口
prisma/
  schema.prisma          数据模型
docker-compose.yml       本地依赖服务
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

按需填写：

- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_*`
- `ELASTICSEARCH_HOST`
- `AUTH_SECRET`
- `USER_API_KEY_ENCRYPTION_KEY`（推荐，未设置时回退到 `AUTH_SECRET`）
- `ZHIPU_API_KEY`
- `ZHIPU_BASE_URL`（可选，自定义代理或兼容网关时使用）
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `TAVILY_API_KEY`（可选）

### 3. 启动基础服务

```bash
docker-compose up -d
```

默认会启动：

- PostgreSQL
- Redis
- MinIO
- Elasticsearch

### 4. 生成 Prisma Client

```bash
pnpm prisma generate
```

### 5. 启动开发环境

```bash
pnpm dev
```

如需单独启动文档处理 Worker：

```bash
pnpm worker
```

## 常用脚本

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm worker
```

## 主要接口

| 接口 | 说明 |
| --- | --- |
| `POST /api/upload` | 上传文档并进入处理队列 |
| `GET /api/documents/status` | 查询文档处理状态 |
| `DELETE /api/documents/[id]` | 删除文档 |
| `POST /api/chat` | SSE 流式问答 |
| `POST /api/search` | 语义检索 |
| `GET /api/sessions` | 获取会话列表 |
| `GET /api/sessions/[id]/messages` | 获取会话消息 |
| `GET/POST/DELETE /api/kb` | 知识库管理 |

## 环境要求

- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis
- MinIO
- Elasticsearch

## 部署文档

- 服务器部署：`DEPLOYMENT.md`
- 笔记本长期运行部署：`DEPLOYMENT_LAPTOP.md`

## 下一步适合演进的方向

- 继续扩展 `LangChain` 能力，加入查询改写、重排、答案评估
- 引入 `LangGraph` 做更复杂的研究助手工作流
- 增加文档级权限、团队空间、引用高亮与文档定位
- 增加评测集与离线效果评估
