# DocMind — 开发进度跟踪

> 📋 **版本：v1.0** | 创建日期：2026-04-30

本文档追踪 DocMind 项目的开发进度，帮助明确哪些工作已完成、哪些正在进行、哪些待做。

---

## 一、项目整体进度

```
总进度：30%
├─ 项目规划与架构设计  ✅ 100%
├─ 前端UI搭建         ✅ 100%
├─ 数据模型与数据库    ✅ 100%
├─ 核心API实现         ⏳ 0%（开始前）
├─ 测试与部署         ⏳ 0%
└─ 优化与迭代         ⏳ 0%
```

---

## 二、各模块详细进度

### 2.1 后端 API 实现（核心）

| API | 接口 | 进度 | 状态 | 优先级 |
|-----|------|------|------|--------|
| 文件上传 | `POST /api/upload` | 0% | ⏳ 待做 | P0 |
| 状态查询 | `GET /api/documents/status` | 0% | ⏳ 待做 | P0 |
| 流式问答 | `POST /api/chat` | 0% | ⏳ 待做 | P0 |
| 文档列表 | `GET /api/documents` | 0% | ⏳ 待做 | P1 |
| 会话列表 | `GET /api/sessions` | 0% | ⏳ 待做 | P1 |
| 会话历史 | `GET /api/sessions/:id/messages` | 0% | ⏳ 待做 | P1 |
| 删除知识库 | `DELETE /api/kb/[id]` | 0% | ⏳ 待做 | P2 |
| 删除文档 | `DELETE /api/documents/:id` | 0% | ⏳ 待做 | P2 |
| 重试处理 | `POST /api/documents/:id/retry` | 0% | ⏳ 待做 | P2 |

### 2.2 核心工具函数

| 模块 | 功能 | 进度 | 状态 | 说明 |
|------|------|------|------|------|
| `lib/rag/document-processor.ts` | 文档解析 + 分块 + 向量化 | 0% | ⏳ 待做 | 调用 pdf-parse / remark + 智谱AI Embedding |
| `lib/rag/embeddings.ts` | 文本向量化 + 向量检索 | 0% | ⏳ 待做 | pgvector 余弦相似度检索 |
| `lib/rag/generation.ts` | AI 流式生成 | 0% | ⏳ 待做 | 调用智谱AI GLM-4-Flash |
| `lib/queue.ts` | BullMQ 队列初始化 | 50% | ⏳ 部分完成 | 配置已完成，需要 Worker |
| `lib/queue.worker.ts` | BullMQ Worker 处理 | 0% | ⏳ 待做 | 异步处理文档 |

### 2.3 前端功能集成

| 页面 | 功能 | 进度 | 状态 | 说明 |
|------|------|------|------|------|
| `/dashboard` | 知识库列表 | 100% | ✅ 完成 | UI完成，仅需调用API |
| `/kb/[id]` | 文档上传 + 列表 | 80% | ⏳ 待完成 | UI完成，需调用 `/api/upload` 和轮询API |
| `/kb/[id]/chat` | 问答页面 | 80% | ⏳ 待完成 | UI完成，需调用 `/api/chat` SSE |
| `/kb/[id]/chat/[sessionId]` | 历史会话 | 80% | ⏳ 待完成 | UI完成，需调用 `/api/sessions/:id/messages` |

### 2.4 测试与部署

| 项目 | 进度 | 状态 | 说明 |
|------|------|------|------|
| 单元测试 | 0% | ⏳ 待做 | API 测试 |
| 集成测试 | 0% | ⏳ 待做 | 端到端流程测试 |
| 部署到 Railway | 0% | ⏳ 待做 | 获得公开链接 |

---

## 三、关键依赖关系

```
文档上传 (/api/upload + Worker)
    ↓
    └─→ 向量化 + 保存 chunks
          ↓
状态查询 (/api/documents/status)
    ↓
    └─→ 前端轮询，确认 ready
          ↓
问答功能 (/api/chat)
    ↓
    └─→ 检索 chunks + 流式生成
```

**因此实现顺序必须是：**
1. `/api/upload` + Worker（文档处理）
2. `/api/documents/status`（状态查询）
3. `/api/chat`（问答功能）

---

## 四、本周开发计划（建议）

### 周一 ~ 周二：实现 /api/upload + Worker

**目标：** 用户能上传文件，后台异步处理

**任务清单：**
- [ ] 实现 `/api/upload` 路由
  - [ ] 文件校验（大小、类型）
  - [ ] 权限检查
  - [ ] 保存到数据库
  - [ ] 加入 BullMQ 队列
  - [ ] 返回响应
  
- [ ] 实现 `lib/queue.worker.ts`
  - [ ] PDF 解析（pdf-parse）
  - [ ] Markdown 解析（remark）
  - [ ] 文本分块（500 tokens）
  - [ ] 调用智谱AI Embedding
  - [ ] 保存 chunks + vectors 到 pgvector
  - [ ] 更新 document.status
  
- [ ] 测试
  - [ ] 使用 Postman / curl 测试上传
  - [ ] 检查 Redis 队列是否有任务
  - [ ] 检查数据库 chunks 表是否有数据

**预估工时：** 4-6 小时

---

### 周三：实现 /api/documents/status

**目标：** 前端能轮询查询文档处理状态

**任务清单：**
- [ ] 实现 `/api/documents/status` 路由
  - [ ] 查询 Document 表
  - [ ] 计算进度（chunks 数量）
  - [ ] 返回响应
  
- [ ] 前端集成
  - [ ] 调用 API 获取状态
  - [ ] 实现轮询逻辑（3秒一次）
  - [ ] 根据 status 显示进度条
  - [ ] status=ready 时停止轮询

- [ ] 测试
  - [ ] 上传文件，检查状态变化
  - [ ] 验证轮询是否正常停止

**预估工时：** 2-3 小时

---

### 周四 ~ 周五：实现 /api/chat

**目标：** 核心问答功能可用

**任务清单：**
- [ ] 实现 `/api/chat` 路由
  - [ ] 权限检查
  - [ ] 创建会话记录
  - [ ] 保存用户消息
  - [ ] 向量化问题
  - [ ] 检索相关 chunks
  - [ ] 构建 Prompt
  - [ ] 调用智谱AI（流式）
  - [ ] SSE 实时推送
  - [ ] 保存 AI 回答
  - [ ] 发送完成事件
  
- [ ] 前端集成
  - [ ] 调用 `/api/chat` 接收 EventSource
  - [ ] 实时渲染回答文本
  - [ ] 显示引用来源标签
  - [ ] 错误处理

- [ ] 测试
  - [ ] 问答功能端到端测试
  - [ ] 检查引用来源是否准确
  - [ ] 检查流式输出延迟

**预估工时：** 6-8 小时

---

### 周末：测试 + 部署

**任务清单：**
- [ ] 完整流程测试
  - [ ] 上传文件 → 等待处理 → 开始问答
  - [ ] 多轮对话
  - [ ] 删除文档、知识库
  
- [ ] 部署到 Railway
  - [ ] 配置环境变量
  - [ ] 部署数据库迁移
  - [ ] 启动 BullMQ Worker
  - [ ] 测试线上功能
  - [ ] 获得公开链接

- [ ] 更新简历
  - [ ] 添加项目链接
  - [ ] 描述已实现的功能

**预估工时：** 2-3 小时

---

## 五、常见问题与解决方案

### Q1：如何本地调试 BullMQ Worker？

```bash
# 1️⃣ 启动 Redis
brew start redis

# 2️⃣ 启动 Next.js（会自动启动 Worker）
npm run dev

# 3️⃣ 上传文件，观察 Redis 队列变化
redis-cli
> KEYS *
> LRANGE docmind-queue:jobs:active 0 -1
```

### Q2：如何测试 SSE 流式输出？

```bash
# 使用 curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是 RAG?",
    "kbId": "kb-xxx",
    "sessionId": "session-xxx"
  }' \
  --no-buffer
```

### Q3：如何检查 pgvector 向量是否正确保存？

```sql
-- Supabase SQL编辑器
SELECT 
  id,
  content,
  embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM document_chunks
ORDER BY distance
LIMIT 5;
```

### Q4：如何处理大文件（>100MB）？

```
当前限制是 10MB，如果需要支持更大文件：
1. 前端分块上传（Form Data 中多个 file input）
2. 后端合并分块
3. 或者提示用户分割文件再上传
```

---

## 六、部署检查清单

部署前必须检查：

- [ ] Redis 连接成功
- [ ] PostgreSQL + pgvector 扩展已安装
- [ ] Prisma migrations 已执行
- [ ] 环境变量已配置
  - [ ] `DATABASE_URL`
  - [ ] `REDIS_URL`
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `NEXTAUTH_URL`
  - [ ] `ZHIPU_AI_API_KEY`（智谱AI密钥）
- [ ] BullMQ Worker 已启动
- [ ] Route Handlers 可正常访问
- [ ] SSE 流式输出正常
- [ ] 本地完整流程测试通过

---

## 七、性能目标（参考）

| 指标 | 目标 | 说明 |
|------|------|------|
| 文档上传响应 | < 500ms | 入队即返回 |
| 问答首 Token 响应 | < 1s | SSE 开始流式输出 |
| 向量检索延迟 | < 200ms | pgvector P99 |
| BullMQ 处理延迟 | < 30s | 百页PDF文档 |

---

*文档版本：v1.0 | 创建日期：2026-04-30*
