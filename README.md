# DocMind — AI 知识库问答系统

基于 RAG（检索增强生成）的私有文档问答系统。上传文档，获得有引用溯源的精准 AI 回答。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 + React 19 (App Router) |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 数据库 | PostgreSQL (Prisma 7) |
| 对象存储 | MinIO |
| 向量检索 | Elasticsearch 8 (KNN dense_vector) |
| 缓存/队列 | Redis + BullMQ |
| 认证 | NextAuth.js v5 (GitHub / Google OAuth + 邮箱密码) |
| AI | 智谱 AI — GLM-4-Flash (对话) + embedding-3 (向量化) |
| 邮件 | Resend |

---

## 快速开始

### 1. 启动依赖服务

```bash
# PostgreSQL（如本地无实例，自行安装或用 Docker）
# Redis
docker run -d -p 6379:6379 redis:7-alpine

# MinIO
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"

# Elasticsearch
docker run -d -p 9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.0
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入实际值
```

### 3. 数据库迁移

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

### 4. 启动

```bash
# 开发模式（Web + Worker 集成在一个进程）
pnpm dev

# 生产模式（Web 和 Worker 分开启动）
pnpm build
pnpm start
pnpm worker   # 另开终端
```

---

## 环境变量

详见 [`.env.example`](./.env.example)。

---

## 核心功能

- 文档上传：PDF / Markdown / TXT，最大 10 MB，上传即返回（异步处理）
- RAG Pipeline：解析 → 分块（500 token，50 重叠）→ Embedding → Elasticsearch KNN 索引
- 流式问答：SSE 流式输出，引用溯源至原始文档分块
- 多知识库：每个用户可创建多个独立知识库
- 语义搜索：跨知识库全局向量检索
- 用户系统：邮箱注册（验证码）+ GitHub / Google OAuth + 密码重置

---

## API 概览

| 端点 | 说明 |
|------|------|
| `POST /api/upload` | 上传文档，触发异步处理队列 |
| `GET /api/documents/status` | 查询文档处理状态（游标分页） |
| `DELETE /api/documents/[id]` | 删除文档及其向量数据 |
| `GET /api/files/[id]` | 获取文档预签名下载 URL（1 小时有效） |
| `POST /api/chat` | SSE 流式问答 |
| `POST /api/search` | 向量语义搜索 |
| `GET /api/sessions` | 获取对话历史列表 |
| `GET /api/sessions/[id]/messages` | 获取会话消息记录 |
| `GET/POST/DELETE /api/kb` | 知识库管理 |
| `GET/PATCH/DELETE /api/user` | 用户信息管理 |

---

## 已知缺失

- 失败文档的重试入口（UI 按钮已占位，无 onClick 处理）
- 多轮对话上下文（每次请求独立，不携带历史消息）
- 邮箱修改功能
