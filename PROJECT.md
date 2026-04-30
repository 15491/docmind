# DocMind — AI 知识库问答系统项目说明文档

> 📋 **文档版本：v2.0** | 最后更新：2026-04-30  
> 🔄 **当前阶段：核心RAG功能开发中** | 完整的升级计划见【第九章】

---

## 一、项目概述

**项目名称：** DocMind

**一句话描述：** 上传任意文档，基于文档内容进行精准 AI 问答，回答带引用溯源。

**核心价值：** 解决"AI 乱编、不知道答案从哪来"的问题，所有回答均来自用户上传的文档，杜绝大模型幻觉。

---

## 二、需求分析

### 目标用户

- 开发者（上传技术文档 / API 文档问答）
- 学生（上传课件 / 论文进行知识梳理）
- 个人用户（上传任意私有文档进行检索问答）

### 核心痛点

| 痛点 | 现有方案的不足 |
|---|---|
| 文档太长，找信息慢 | 手动翻阅效率低下 |
| 直接问 AI，容易幻觉 | 无文档依据，回答不可信 |
| ChatGPT 知识有截止日期 | 无法用于私有文档或最新资料 |

### 用户故事（核心）

1. 作为用户，我可以上传 PDF / Markdown / TXT 文件，建立专属知识库
2. 作为用户，我可以针对知识库内容提问，得到带来源标注的精准回答
3. 作为用户，我可以管理多个独立知识库，不同项目内容互相隔离
4. 作为用户，我可以查看历史对话记录，方便回溯

---

## 三、技术选型

| 层级 | 技术 | 选择理由 |
|---|---|---|
| 框架 | Next.js 16 App Router | SSR + Server Actions + Streaming 天然支持，React Compiler 自动优化，SEO 友好 |
| 语言 | TypeScript | 类型安全，工程规范，减少运行时错误 |
| 样式 | Tailwind CSS + shadcn/ui | 开发效率高，组件风格统一 |
| AI 对话 | 智谱AI GLM-4-Flash | 国内直连，支持流式输出，长上下文，价格低廉 |
| Embedding | 智谱AI `embedding-3` | 国内直连，维度 2048，与 GLM 同平台，免费额度满足个人项目 |
| 向量数据库 | pgvector（PostgreSQL 扩展） | 无需独立向量数据库服务，与业务数据同库管理，降低部署复杂度 |
| ORM | Prisma | 类型安全，Schema 即文档，迁移管理完善 |
| 数据库托管 | Supabase | 免费额度够用，内置 pgvector 支持，无需自建 PostgreSQL |
| 文件解析 | pdf-parse / remark | 分别处理 PDF 和 Markdown，成熟稳定 |
| 认证 | NextAuth.js | 快速集成，支持 GitHub / Google OAuth |
| 队列 | BullMQ + Redis | 大文件 Embedding 异步处理，Worker 常驻，避免请求超时 |
| 部署 | Railway | 支持 Node.js 常驻进程，可运行 BullMQ Worker；内置 Redis 插件；Next.js 原生支持 |

---

## 四、功能设计

### 核心功能（MVP，必须实现）

- **文档上传：** 支持 PDF / Markdown / TXT，上传后自动解析、分块、向量化入库
- **知识库管理：** 创建 / 删除知识库，查看知识库下的文档列表及处理状态
- **流式问答：** 针对知识库提问，SSE 流式输出回答，标注引用来源（文档名 + 段落）
- **对话历史：** 保存每次问答记录，支持查看历史会话

### 扩展功能（视时间决定）

- **文档预览：** 侧边栏高亮显示被引用的原文段落
- **多轮对话：** 记住上文上下文，支持连续追问
- **知识库分享：** 生成公开链接，访客可问答但不可管理文档
- **相关问题推荐：** 回答后自动生成 3 个追问方向

### 明确不做（控制范围）

- 富文本编辑器
- 团队协作 / 成员权限管理
- 移动端适配
- 文档内容编辑

---

## 五、系统架构

### RAG Pipeline（核心链路）

> **✅ 当前状态：** 基础RAG Pipeline已设计，实现中  
> **⚠️ 计划中的升级：** Agent编排 → MCP工具系统 → 完整Harness架构（见第九章）

```
【文档处理链路 - 异步】
用户上传文件
  → 文件类型检测 + 大小校验（限制 10MB）
  → 文件解析（pdf-parse / remark → 纯文本）
  → 文本分块（Chunk，500 tokens，overlap 50 tokens）
  → 批量 Embedding（智谱AI embedding-3）
  → 向量 + 原文存入 pgvector（document_chunks 表）
  → 更新文档状态（processing → ready）

【问答链路 - 实时】
用户提问
  → 问题文本 Embedding（智谱AI）
  → pgvector 余弦相似度检索（Top-K = 5）
  → 组装 Prompt（System Prompt + 检索 Chunks + 对话历史 + 用户问题）
  → GLM API 流式生成（SSE）
  → 前端实时渲染 + 来源高亮标注
  → 保存问答记录至数据库
```

### 关键工程决策

| 决策点 | 选用方案 | 原因 |
|---|---|---|
| 分块策略 | 固定 Token 数 + 重叠滑窗 | 简单可控，overlap 保证跨块语义连贯性 |
| 检索方式 | 纯向量检索（余弦相似度） | MVP 阶段够用，后期可加关键词混合检索（BM25） |
| 流式实现 | Route Handler + ReadableStream | Server Actions 对长时间流式支持不稳定 |
| 上下文长度控制 | Top-5 Chunks ≈ 2500 tokens | 保证检索质量同时避免超出上下文窗口 |
| 大文件处理 | BullMQ 异步队列 + 状态轮询 | 避免请求超时，Worker 常驻处理，用户可关闭页面后台继续 |

### 整体架构图

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
│  知识库管理页  /  问答页  /  历史记录页        │
└──────────────────┬──────────────────────────┘
                   │ HTTP / SSE
┌──────────────────▼──────────────────────────┐
│              Next.js App Router（Railway 部署）      │
│  ┌──────────────┐   ┌──────────────────────┐│
│  │ Server       │   │ Route Handlers        ││
│  │ Actions      │   │ /api/chat (SSE)       ││
│  │ (CRUD)       │   │ /api/upload           ││
│  └──────────────┘   └──────────────────────┘│
│         ┌────────────────────────────────────┐│
│         │ BullMQ Worker（文档处理队列）        ││
│         └────────────────────────────────────┘│
└──────┬────────────────────┬─────────────────┘
       │                    │
┌──────▼──────┐    ┌────────▼────────┐    ┌──────────────┐
│  Supabase   │    │     Redis        │    │  智谱AI API  │
│  PostgreSQL │    │  (BullMQ 队列)   │    │  GLM-4-Flash │
│  + pgvector │    └─────────────────┘    │  embedding-3 │
└─────────────┘                           └──────────────┘
```

---

## 六、数据模型

```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  name           String?
  knowledgeBases KnowledgeBase[]
  createdAt      DateTime        @default(now())
}

// 知识库
model KnowledgeBase {
  id        String      @id @default(cuid())
  name      String
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  documents Document[]
  sessions  ChatSession[]
  createdAt DateTime    @default(now())
}

// 文档
model Document {
  id              String          @id @default(cuid())
  fileName        String
  fileSize        Int
  mimeType        String
  status          String          @default("processing") // processing | ready | failed
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase   @relation(fields: [knowledgeBaseId], references: [id])
  chunks          DocumentChunk[]
  createdAt       DateTime        @default(now())
}

// 文档分块（含向量）
model DocumentChunk {
  id         String                       @id @default(cuid())
  content    String
  chunkIndex Int
  documentId String
  document   Document                     @relation(fields: [documentId], references: [id])
  embedding  Unsupported("vector(2048)")  // pgvector 向量列（智谱AI embedding-3 维度）
}

// 对话会话
model ChatSession {
  id              String        @id @default(cuid())
  title           String?
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id])
  messages        Message[]
  createdAt       DateTime      @default(now())
}

// 消息记录
model Message {
  id        String   @id @default(cuid())
  role      String   // user | assistant
  content   String
  sources   Json?    // 引用的 chunk 信息：[{ documentName, chunkIndex, content }]
  sessionId String
  session   ChatSession @relation(fields: [sessionId], references: [id])
  createdAt DateTime @default(now())
}
```

---

## 七、主要页面

| 页面 | 路径 | 核心内容 |
|---|---|---|
| 首页 | `/` | 产品介绍、功能亮点、登录 / 注册入口 |
| 控制台 | `/dashboard` | 知识库卡片列表，新建 / 删除知识库 |
| 知识库详情 | `/kb/[id]` | 文档列表、上传入口、文档处理状态 |
| 问答页面 | `/kb/[id]/chat` | 左侧会话列表，右侧对话区域 + 来源标注 |
| 历史记录 | `/kb/[id]/chat/[sessionId]` | 查看历史会话完整内容 |

---

## 八、错误处理与边界情况

| 场景 | 处理方案 |
|---|---|
| 文件超过 10MB | 前端拦截，提示文件大小限制 |
| 不支持的文件类型 | 前端校验 MIME 类型，拒绝上传 |
| Embedding API 调用失败 | 文档状态标记为 `failed`，提示用户重试 |
| 向量检索无匹配结果 | 兜底提示："未在知识库中找到相关内容，请尝试换个问法" |
| GLM API 超时 / 报错 | 流式中断，前端展示错误提示，不保存本次记录 |
| 大文件处理超时 | 异步处理 + 状态轮询，用户无需等待页面响应 |

---

## 九、性能与费用控制

### 性能目标

- 文档上传响应（入队）：< 500ms
- 问答首 Token 响应：< 1s
- pgvector 检索延迟（P99）：< 200ms

### 费用估算

| 项目 | 单价 | 估算用量 | 月费用 |
|---|---|---|---|
| 智谱AI Embedding | 免费额度 / ¥0.5/1M tokens | ~500K tokens | ~¥0.25 |
| 智谱AI GLM-4-Flash | ¥0.1/1M tokens | ~100K tokens | ~¥0.01 |
| Supabase | 免费额度 500MB | 个人项目够用 | $0 |
| Railway | $5/月起 | 含 Redis + Node.js 常驻进程 | ~$5 |

---

## 十、简历亮点提炼

> - 独立设计并实现完整 RAG Pipeline：文档解析 → 语义分块（固定 Token + 滑窗重叠）→ Embedding 向量化 → pgvector 余弦相似度检索 → Prompt 构建 → GLM API 流式问答
> - 基于 Next.js 16 App Router 构建，Route Handler 实现 SSE 流式输出，首 Token 响应时间 < 1s
> - 引入 pgvector 扩展替代独立向量数据库服务，降低部署复杂度，向量检索 P99 延迟 < 200ms
> - 实现引用溯源功能，AI 回答精准定位来源文档段落，有效解决大模型幻觉问题
> - 支持 PDF / Markdown / TXT 多格式文档处理，异步队列架构保障大文件上传体验

---

## 十一、当前实现状态（✅ / ⚠️）

### 已完成 / 设计完成（✅）

| 功能 | 状态 | 说明 |
|------|------|------|
| RAG Pipeline 架构设计 | ✅ | 文档处理 → Embedding → 向量检索 → 流式生成 |
| 数据模型设计 | ✅ | Prisma Schema 完成，支持pgvector |
| 前端UI框架 | ✅ | Next.js 16 + React 19 + shadcn/ui 组件搭建完成 |
| 数据库 + ORM | ✅ | PostgreSQL + Prisma + pgvector 配置完成 |
| 认证系统 | ✅ | NextAuth.js GitHub OAuth 集成完成 |
| BullMQ 队列系统 | ✅ | Redis + BullMQ 基础配置完成 |

### 实现中（⚠️）

| 功能 | 进度 | 计划 |
|------|------|------|
| 文档上传 + 处理 API | 30% | `/api/upload` 实现 |
| 向量化 + 检索逻辑 | 20% | 调用智谱AI Embedding API |
| 问答接口 | 20% | `/api/chat` SSE 流式实现 |
| 对话历史保存 | 10% | `/api/sessions` CRUD |

---

## 十二、未来升级路线（分阶段）

### 阶段1：完成基础RAG（当前，预计1-2周）

**目标：** MVP 可投递简历阶段

**核心工作：**
- ✅ 完成 `/api/upload` — 文件上传 + 异步处理队列
- ✅ 完成 `/api/chat` — SSE 流式问答
- ✅ 完成 `/api/documents` — 文档列表 + 状态查询
- ✅ 部署到 Railway，获得可公开访问的演示链接

**简历表达：** 
```
独立设计并实现完整 RAG Pipeline：文档解析 → 语义分块 → Embedding 向量化 
→ pgvector 余弦相似度检索 → Prompt 拼装 → GLM API 流式问答
```

---

### 阶段2：Agent 编排系统（2-3周后，可选）

**目标：** 升级简历到"Agent 系统设计"，提升竞争力

**核心思路：** 从单一 RAG 流程升级为可编排的多 Agent 系统

```
用户提问
  ↓
PreprocessAgent（意图识别、关键词提取）
  ↓
SearchAgent（向量检索、结果排序）
  ↓
GenerateAgent（Prompt 拼装、流式生成）
  ↓
ValidationAgent（答案校验、置信度评分）
  ↓
用户展示
```

**实现方式：**
- 定义 Agent 接口（execute 方法）
- 实现简单的编排器（不需要 LangGraph，自己实现）
- 支持 Agent 间的上下文传递

**简历表达升级为：**
```
设计可编排的多 Agent 系统：用户问题 → 意图识别 Agent → 向量检索 Agent 
→ 内容生成 Agent → 答案校验 Agent，Agent 间支持状态传递与结果组合
```

---

### 阶段3：MCP 工具系统（1个月后，可选）

**目标：** 让 Agent 能调用外部工具，支持扩展

**核心概念：** MCP（Model Context Protocol）是 OpenAI 推出的工具标准化协议

**实现方向：**
- 定义 Skill/Tool 接口（符合 MCP 风格）
- 实现工具注册系统（Agent 可动态加载工具）
- 支持的工具示例：
  - WebSearch Tool（网络搜索）
  - Calculator Tool（数学计算）
  - Code Executor Tool（代码执行）
  - API Caller Tool（调用外部 API）

**简历表达升级为：**
```
基于 MCP 协议实现工具系统，Agent 可调用 WebSearch、Calculator、API Caller 等 Tool，
支持单个知识库引入外部数据源，提升问答精准度
```

---

### 阶段4：完整 Harness 架构（视情况，长期规划）

**说明：** 这是企业级框架，个人项目暂不优先

**仅作了解：** 包含 workflow executor、scheduler、complete runtime management 等，用于构建复杂的 AI 应用系统

---

## 十三、API 实现清单与详细指南

> 📖 **详细实现指南** → 见 [`API_IMPLEMENTATION.md`](./API_IMPLEMENTATION.md)  
> 包含：完整代码示例、数据流、错误处理、关键实现细节

### 优先级 1（必须做）— 核心三API

| 接口 | 方法 | 功能 | 详见 |
|------|------|------|------|
| `/api/upload` | POST | 上传文档，触发异步处理 | API_IMPLEMENTATION.md 第二章 |
| `/api/chat` | POST | SSE 流式问答 | API_IMPLEMENTATION.md 第三章 |
| `/api/documents/status` | GET | 查询文档处理状态 | API_IMPLEMENTATION.md 第四章 |

### 补充API（查询、删除）

| 接口 | 方法 | 功能 | 优先级 |
|------|------|------|--------|
| `/api/documents` | GET | 查询知识库文档列表 | P1 |
| `/api/sessions` | GET | 查询会话列表 | P1 |
| `/api/sessions/:id/messages` | GET | 查询会话历史 | P1 |
| `/api/kb/[id]` | DELETE | 删除知识库 | P2 |
| `/api/documents/:id` | DELETE | 删除文档 | P2 |
| `/api/documents/:id/retry` | POST | 重新处理失败的文档 | P2 |
| `/api/sessions/:id` | DELETE | 删除会话 | P2 |

### 快速开发流程

```
第1步：实现 /api/upload（包括BullMQ后台处理）
  ↓
第2步：实现 /api/documents/status（前端轮询用）
  ↓
第3步：实现 /api/chat（核心问答功能）
  ↓
测试：部署到 Railway，获得演示链接
```

---

*文档版本：v2.0 | 最后更新：2026-04-30*
