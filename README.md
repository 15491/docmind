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

### 本地开发

#### 方式一：Docker Compose（推荐）

```bash
# 一键启动所有依赖服务 + 应用
docker-compose up -d

# 应用运行在 http://localhost:3000
# 查看日志
docker-compose logs -f app
```

#### 方式二：手动启动

```bash
# 1. 启动依赖服务
docker run -d --name redis -p 6379:6379 redis:7-alpine
docker run -d --name minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
docker run -d --name es -p 9200:9200 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.0

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入实际值（特别是 ZHIPU_API_KEY、RESEND_API_KEY）

# 3. 数据库迁移
pnpm prisma migrate deploy
pnpm prisma generate

# 4. 启动应用
pnpm dev
```

### 生产部署

- **VPS 服务器部署**：[DEPLOYMENT.md](./DEPLOYMENT.md) — 云服务器部署全流程（2C4G VPS、Docker Compose、Nginx 反向代理、HTTPS）
- **笔记本部署**：[DEPLOYMENT_LAPTOP.md](./DEPLOYMENT_LAPTOP.md) — 个人电脑部署方案（Cloudflare Tunnel、24/7 运行配置、监控备份）

---

## 环境变量

详见 [`.env.example`](./.env.example)。

**关键变量说明**：

| 变量 | 必需 | 默认值 | 说明 |
|------|------|-------|------|
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `REDIS_URL` | ✅ | - | Redis 连接 URL（用于 BullMQ） |
| `MINIO_ENDPOINT` | ✅ | localhost | MinIO 服务地址 |
| `ELASTICSEARCH_HOST` | ✅ | http://localhost:9200 | Elasticsearch 地址 |
| `ZHIPU_API_KEY` | ✅ | - | 智谱 AI API Key（从 https://open.bigmodel.cn 获取） |
| `AUTH_SECRET` | ✅ | - | NextAuth 密钥（`openssl rand -base64 32` 生成） |
| `RESEND_API_KEY` | ✅ | - | Resend 邮件 API Key（从 https://resend.com 获取） |
| `TAVILY_API_KEY` | ⭕ | - | 可选，用于网络搜索；免费额度 1000 次/月 |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | ⭕ | - | 可选，GitHub OAuth 登录（从 https://github.com/settings/developers 获取） |
| `AUTH_GITHUB_PROXY_URL` | ⭕ | - | 仅 GitHub OAuth 使用的服务端代理地址，例如 `http://127.0.0.1:7890` |

---

## 核心功能

- 文档上传：PDF / Markdown / TXT，最大 50 MB，上传即返回（异步处理）；内容 MD5 哈希去重，防止重复上传
- RAG Pipeline：解析 → 分块（500 token，50 重叠）→ Embedding → Elasticsearch KNN 索引
- 流式问答：SSE 流式输出，引用溯源至原始文档分块；Tool Calling 实时网络搜索
- 消息管理：多轮对话上下文保留，超 20 条消息自动压缩摘要
- 多知识库：每个用户可创建多个独立知识库，四层级数据隔离
- 语义搜索：跨知识库全局向量检索（Elasticsearch KNN）
- 用户系统：邮箱注册（验证码）+ GitHub OAuth + 密码重置

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

- RAG 参数持久化（top-K、chunk size 等检索参数目前仅存本地 localStorage，无法跨设备同步）
- 用户头像上传功能（字段已在数据库，UI 待实现）
