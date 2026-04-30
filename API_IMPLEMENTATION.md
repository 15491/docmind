# DocMind — 核心API实现指南

> 📋 **文档版本：v1.0** | 创建日期：2026-04-30  
> 🎯 **目标：** 三个优先级P0 API 实现方案详解

本文档详细规划 DocMind 最核心的三个 API，包括数据流、错误处理、代码实现思路。

---

## 一、API 总览

| 接口 | 方法 | 功能 | 优先级 |
|------|------|------|--------|
| `/api/upload` | POST | 上传文档，触发异步处理 | P0 |
| `/api/chat` | POST | SSE 流式问答 | P0 |
| `/api/documents/status` | GET | 查询文档处理状态 | P0 |

---

## 二、API 1：`POST /api/upload` — 文件上传

### 2.1 功能描述

**核心目标：** 用户上传文件 → 快速返回 → BullMQ 异步处理

**关键特性：**
- 秒级响应（入队即返回，不等待处理完成）
- 前端轮询监听处理进度
- 支持大文件（百页PDF）无超时

### 2.2 请求格式

```javascript
// 前端调用示例
const formData = new FormData();
formData.append('file', file); // File 对象
formData.append('kbId', knowledgeBaseId); // 知识库ID

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  // 不设置 Content-Type，浏览器自动设置 multipart/form-data
});

const result = await response.json();
// {
//   success: true,
//   documentId: "cuid-xxx",
//   jobId: "job-xxx",
//   status: "processing",
//   message: "文档已上传，后台处理中..."
// }
```

### 2.3 响应格式

#### 成功响应（200）

```json
{
  "success": true,
  "documentId": "clr7x9z8w0000q1w8z9z9z9z9",
  "jobId": "docmind-upload-job-1234567890",
  "status": "processing",
  "fileName": "api-reference.pdf",
  "fileSize": 2458624,
  "message": "文档已上传，后台处理中...请勿关闭页面"
}
```

#### 失败响应

```json
// 400 - 文件校验失败
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "文件大小超过 10MB 限制"
}

// 400 - 不支持的文件类型
{
  "success": false,
  "error": "UNSUPPORTED_TYPE",
  "message": "仅支持 PDF / Markdown / TXT 文件"
}

// 500 - 服务器错误
{
  "success": false,
  "error": "QUEUE_ERROR",
  "message": "队列系统异常，请稍后重试"
}
```

### 2.4 核心业务逻辑

```typescript
// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { documentQueue } from '@/lib/queue';
import { authOptions } from '@/lib/auth.config';

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2️⃣ 解析 FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const kbId = formData.get('kbId') as string;

    // 3️⃣ 前端校验（服务端也要再验一遍）
    if (!file) {
      return NextResponse.json(
        { error: 'NO_FILE', message: '未选择文件' },
        { status: 400 }
      );
    }

    // 4️⃣ 文件大小校验（10MB）
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', message: '文件大小超过 10MB' },
        { status: 400 }
      );
    }

    // 5️⃣ 文件类型校验
    const ALLOWED_TYPES = [
      'application/pdf',
      'text/markdown',
      'text/plain',
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'UNSUPPORTED_TYPE', message: '不支持的文件类型' },
        { status: 400 }
      );
    }

    // 6️⃣ 验证知识库归属（用户权限检查）
    const kb = await prisma.knowledgeBase.findFirst({
      where: {
        id: kbId,
        user: { email: session.user.email },
      },
    });

    if (!kb) {
      return NextResponse.json(
        { error: 'KB_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 7️⃣ 保存文档记录到数据库（状态：processing）
    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'processing',
        knowledgeBaseId: kbId,
      },
    });

    // 8️⃣ 将文件转换为 Buffer
    const buffer = await file.arrayBuffer();

    // 9️⃣ 将任务加入 BullMQ 队列
    const job = await documentQueue.add(
      'process-document',
      {
        documentId: document.id,
        fileName: file.name,
        fileContent: Buffer.from(buffer).toString('base64'), // 编码为 base64 便于传输
        mimeType: file.type,
        kbId: kbId,
      },
      {
        attempts: 3, // 失败重试 3 次
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true, // 完成后删除任务
      }
    );

    // 🔟 秒速返回，不等待处理完成
    return NextResponse.json(
      {
        success: true,
        documentId: document.id,
        jobId: job.id,
        status: document.status,
        fileName: document.fileName,
        fileSize: document.fileSize,
        message: '文档已上传，后台处理中...请勿关闭页面',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[/api/upload] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
```

### 2.5 关键点说明

| 关键点 | 说明 |
|--------|------|
| **秒级返回** | 文件保存到DB后立即返回，不等待Embedding处理 |
| **BullMQ队列** | 后台 Worker 异步处理，支持大文件无超时 |
| **Base64编码** | 将二进制文件编码为 base64 字符串便于队列传输 |
| **权限检查** | 确保文件只能上传到用户自己的知识库 |
| **重试机制** | 失败自动重试3次，指数退避延迟 |

### 2.6 BullMQ Worker 处理逻辑

```typescript
// src/lib/queue.worker.ts

import { Worker } from 'bullmq';
import { documentQueue } from '@/lib/queue';
import { prisma } from '@/lib/prisma';
import { processDocument } from '@/lib/rag/document-processor';

export const documentWorker = new Worker(
  'docmind-queue',
  async (job) => {
    const { documentId, fileName, fileContent, mimeType, kbId } = job.data;

    try {
      console.log(`[Worker] Processing document: ${documentId}`);

      // 1️⃣ 解码 base64
      const buffer = Buffer.from(fileContent, 'base64');

      // 2️⃣ 调用文档处理函数（文档解析 → 分块 → 向量化）
      const chunks = await processDocument({
        buffer,
        mimeType,
        fileName,
      });

      // 3️⃣ 批量保存 chunks 到数据库（含向量）
      await prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          content: chunk.text,
          chunkIndex: index,
          documentId,
          embedding: chunk.embedding, // pgvector 格式
        })),
      });

      // 4️⃣ 更新文档状态为 ready
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready' },
      });

      console.log(`[Worker] Document ${documentId} processed successfully`);
      return { success: true, documentId };

    } catch (error) {
      console.error(`[Worker] Error processing ${documentId}:`, error);

      // 5️⃣ 更新文档状态为 failed
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'failed' },
      });

      throw error; // 让 BullMQ 知道任务失败
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  }
);
```

---

## 三、API 2：`POST /api/chat` — SSE 流式问答

### 3.1 功能描述

**核心目标：** 流式传输 AI 生成的回答，边生成边渲染

**关键特性：**
- SSE（Server-Sent Events）流式传输
- 首 Token 响应 < 1s
- 实时高亮引用来源
- 自动保存对话历史

### 3.2 请求格式

```javascript
// 前端调用示例
const eventSource = new EventSource('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    question: '如何在 Next.js 中使用 SSE?',
    kbId: 'kb-xxx',
    sessionId: 'session-xxx', // 可选，新会话不需要
  }),
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'chunk') {
    // 接收到回答的一部分
    appendToMessageContent(data.content);
  } else if (data.type === 'sources') {
    // 接收到引用来源
    renderSources(data.sources);
  }
};

eventSource.onerror = () => {
  console.error('Stream error');
  eventSource.close();
};
```

### 3.3 响应格式（SSE 流）

```
event: chunk
data: {"type": "chunk", "content": "在", "done": false}

event: chunk
data: {"type": "chunk", "content": " Next.js", "done": false}

event: chunk
data: {"type": "chunk", "content": " 中使用", "done": false}

...

event: sources
data: {"type": "sources", "sources": [{"documentName": "nextjs-docs.pdf", "chunkIndex": 3, "similarity": 0.95}]}

event: done
data: {"type": "done"}
```

### 3.4 核心业务逻辑

```typescript
// src/app/api/chat/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { embedText, searchVectors, generateAnswer } from '@/lib/rag';
import { authOptions } from '@/lib/auth.config';

export async function POST(request: NextRequest) {
  try {
    // 1️⃣ 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2️⃣ 解析请求体
    const { question, kbId, sessionId } = await request.json();

    if (!question || !kbId) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 3️⃣ 权限检查：确保知识库属于当前用户
    const kb = await prisma.knowledgeBase.findFirst({
      where: {
        id: kbId,
        user: { email: session.user.email },
      },
    });

    if (!kb) {
      return NextResponse.json(
        { error: 'KB_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 4️⃣ 如果没有 sessionId，创建新会话
    let session_record: any;
    if (!sessionId) {
      session_record = await prisma.chatSession.create({
        data: {
          knowledgeBaseId: kbId,
          title: question.slice(0, 50), // 用问题开头作为会话标题
        },
      });
    } else {
      session_record = await prisma.chatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session_record || session_record.knowledgeBaseId !== kbId) {
        return NextResponse.json(
          { error: 'SESSION_NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    // 5️⃣ 将用户问题保存到数据库（消息类型：user）
    await prisma.message.create({
      data: {
        role: 'user',
        content: question,
        sessionId: session_record.id,
      },
    });

    // 6️⃣ 对问题进行向量化
    const questionEmbedding = await embedText(question);

    // 7️⃣ 向量检索：找出最相关的 Top-5 文档片段
    const relevantChunks = await searchVectors({
      embedding: questionEmbedding,
      kbId,
      topK: 5,
    });

    // 8️⃣ 获取对话历史上下文（最近3轮对话）
    const chatHistory = await prisma.message.findMany({
      where: { sessionId: session_record.id },
      orderBy: { createdAt: 'asc' },
      take: -6, // 获取最后6条（3轮对话）
      select: { role: true, content: true },
    });

    // 9️⃣ 构建 Prompt
    const systemPrompt = `你是一个知识库助手，回答用户问题时：
1. 仅基于提供的文档内容回答
2. 如果文档中没有答案，明确说"文档中未找到相关内容"
3. 给出答案后，在末尾指出信息来源`;

    const contextChunks = relevantChunks
      .map((chunk) => `[来源：${chunk.fileName}]\n${chunk.content}`)
      .join('\n\n');

    const conversationContext = chatHistory
      .map((msg) => `${msg.role === 'user' ? '用户' : '助手'}：${msg.content}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

【可用文档内容】
${contextChunks}

【对话历史】
${conversationContext}

用户提问：${question}

请回答：`;

    // 🔟 SSE 流式生成回答
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullAnswer = '';
          const encoder = new TextEncoder();

          // 流式调用 AI API（智谱AI）
          const response = await generateAnswer(fullPrompt, {
            stream: true,
          });

          // 处理流式响应
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullAnswer += content;
              // 发送 chunk 事件
              controller.enqueue(
                encoder.encode(
                  `event: chunk\ndata: ${JSON.stringify({
                    type: 'chunk',
                    content,
                    done: false,
                  })}\n\n`
                )
              );
            }
          }

          // 流式传输完成后，发送引用来源
          const sources = relevantChunks.map((chunk) => ({
            documentName: chunk.fileName,
            chunkIndex: chunk.chunkIndex,
            similarity: chunk.similarity,
          }));

          controller.enqueue(
            encoder.encode(
              `event: sources\ndata: ${JSON.stringify({
                type: 'sources',
                sources,
              })}\n\n`
            )
          );

          // 保存 AI 回答到数据库（消息类型：assistant）
          await prisma.message.create({
            data: {
              role: 'assistant',
              content: fullAnswer,
              sources: sources, // JSON 格式保存引用来源
              sessionId: session_record.id,
            },
          });

          // 发送完成事件
          controller.enqueue(
            encoder.encode(`event: done\ndata: ${JSON.stringify({
              type: 'done',
              sessionId: session_record.id,
            })}\n\n`)
          );

          controller.close();

        } catch (error) {
          console.error('[/api/chat] Error:', error);
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                type: 'error',
                message: '流式生成失败，请稍后重试',
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    // 返回 SSE 响应
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[/api/chat] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### 3.5 关键点说明

| 关键点 | 说明 |
|--------|------|
| **流式传输** | 使用 ReadableStream + SSE，边生成边传输 |
| **向量检索** | Top-5 最相关文档片段 + 余弦相似度 |
| **上下文管理** | 保持最近3轮对话，防止 token 溢出 |
| **引用溯源** | 每个 chunk 记录来源文档名和段落索引 |
| **自动保存** | 对话立即保存到数据库，支持历史查询 |

---

## 四、API 3：`GET /api/documents/status` — 文档处理状态

### 4.1 功能描述

**核心目标：** 前端轮询查询文档处理进度

**关键特性：**
- 快速返回（查询数据库即可）
- 支持批量查询
- 返回处理进度（百分比）

### 4.2 请求格式

```javascript
// 前端轮询调用（每3秒一次）
const response = await fetch('/api/documents/status', {
  method: 'GET',
  headers: {
    'x-kb-id': kbId,
    'x-document-ids': documentId1,documentId2, // 逗号分隔
  },
});

const result = await response.json();
```

### 4.3 响应格式

```json
{
  "success": true,
  "documents": [
    {
      "id": "doc-1",
      "fileName": "api-doc.pdf",
      "status": "ready",
      "progress": 100,
      "totalChunks": 45,
      "processedChunks": 45
    },
    {
      "id": "doc-2",
      "fileName": "notes.md",
      "status": "processing",
      "progress": 65,
      "totalChunks": 20,
      "processedChunks": 13
    },
    {
      "id": "doc-3",
      "fileName": "guide.txt",
      "status": "failed",
      "progress": 0,
      "error": "EMBEDDING_FAILED"
    }
  ]
}
```

### 4.4 核心业务逻辑

```typescript
// src/app/api/documents/status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth.config';

export async function GET(request: NextRequest) {
  try {
    // 1️⃣ 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2️⃣ 获取查询参数
    const kbId = request.headers.get('x-kb-id');
    const docIds = request.headers.get('x-document-ids')?.split(',') || [];

    if (!kbId) {
      return NextResponse.json(
        { error: 'MISSING_KB_ID' },
        { status: 400 }
      );
    }

    // 3️⃣ 权限检查：确保知识库属于当前用户
    const kb = await prisma.knowledgeBase.findFirst({
      where: {
        id: kbId,
        user: { email: session.user.email },
      },
    });

    if (!kb) {
      return NextResponse.json(
        { error: 'KB_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 4️⃣ 查询文档列表及 chunks 信息
    const documents = await prisma.document.findMany({
      where: {
        knowledgeBaseId: kbId,
        ...(docIds.length > 0 && { id: { in: docIds } }),
      },
      include: {
        chunks: {
          select: {
            id: true,
          },
        },
      },
    });

    // 5️⃣ 构建响应数据
    const documentStatus = documents.map((doc) => {
      const totalChunks = doc.chunks.length || 0;
      const processedChunks = totalChunks; // 如果 status=ready，说明所有 chunks 已处理

      return {
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status, // processing | ready | failed
        progress:
          doc.status === 'ready'
            ? 100
            : doc.status === 'processing'
            ? 50 // 简化处理，实际可以根据队列进度更新
            : 0,
        totalChunks,
        processedChunks,
        createdAt: doc.createdAt,
        ...(doc.status === 'failed' && {
          error: 'EMBEDDING_FAILED', // 实际从队列失败日志获取
        }),
      };
    });

    // 6️⃣ 返回结果
    return NextResponse.json({
      success: true,
      kbId,
      documents: documentStatus,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[/api/documents/status] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

### 4.5 前端轮询实现

```typescript
// src/app/dashboard/kb/[id]/hooks.ts

import { useEffect, useState } from 'react';

export function useDocumentStatusPolling(kbId: string, docIds: string[]) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!docIds.length) return;

    // 检查是否有 processing 状态的文档
    const hasProcessing = documents.some((doc) => doc.status === 'processing');

    if (!hasProcessing) {
      setIsPolling(false);
      return;
    }

    // 启动轮询
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/documents/status', {
          method: 'GET',
          headers: {
            'x-kb-id': kbId,
            'x-document-ids': docIds.join(','),
          },
        });

        const data = await response.json();
        if (data.success) {
          setDocuments(data.documents);

          // 检查是否全部完成
          const allDone = data.documents.every(
            (doc: any) => doc.status !== 'processing'
          );
          if (allDone) {
            setIsPolling(false);
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('轮询失败:', error);
      }
    }, 3000); // 每3秒轮询一次

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [kbId, docIds]);

  return { documents, isPolling };
}
```

### 4.6 关键点说明

| 关键点 | 说明 |
|--------|------|
| **快速查询** | 仅查询数据库，无IO操作，毫秒级响应 |
| **进度计算** | 通过 chunks 数量推断处理进度 |
| **批量查询** | 支持同时查询多个文档的状态 |
| **轮询停止条件** | 所有文档处于 ready/failed，停止轮询 |

---

## 五、三个 API 的数据流总结

```
【文件上传流程】
用户上传 → /api/upload 验证 → 保存DB → 加入BullMQ队列 → 秒速返回
                                           ↓
                              BullMQ Worker 后台处理（异步）
                              ├─ 文档解析（pdf-parse / remark）
                              ├─ 文本分块（500 tokens）
                              ├─ 调用智谱AI Embedding API
                              ├─ 保存 chunks + vectors 到 pgvector
                              └─ 更新 document.status = ready

【状态轮询流程】
前端启动轮询 → /api/documents/status 查询 → 返回 processing/ready/failed
                                      ↓
            status=ready？ → Yes → 停止轮询，启用问答
            status=failed？ → Yes → 停止轮询，显示重试按钮

【问答流程】
用户提问 → /api/chat 接收
              ├─ 验证权限
              ├─ 创建会话记录
              ├─ 保存用户消息
              ├─ 问题向量化
              ├─ pgvector 检索 Top-5 chunks
              ├─ 获取对话历史
              └─ 构建 Prompt
                  ↓
              调用智谱AI GLM-4-Flash（流式）
                  ↓
              SSE 实时推送回答文本
                  ↓
              末尾推送引用来源
                  ↓
              保存 AI 消息 + sources 到数据库
                  ↓
              发送完成事件
```

---

## 六、开发建议与步骤

### 6.1 实现顺序

1. **先实现 API 1（文件上传）**
   - 完成上传、保存DB、加入队列
   - BullMQ Worker 的处理逻辑（需要 `/lib/rag/document-processor.ts`）

2. **再实现 API 3（状态查询）**
   - 简单的数据库查询，用于前端轮询
   - 检查 API 1 是否正常工作

3. **最后实现 API 2（问答）**
   - 涉及向量检索、提示词构建、流式输出
   - 需要依赖 API 1 的结果（chunks + vectors）

### 6.2 关键库依赖

```json
{
  "dependencies": {
    "bullmq": "^5.x",
    "pdf-parse": "^1.x",
    "remark": "^15.x",
    "remark-parse": "^10.x",
    "next-auth": "^5.x",
    "prisma": "^5.x"
  }
}
```

### 6.3 需要实现的工具函数

```typescript
// src/lib/rag/document-processor.ts
export async function processDocument(props: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<Array<{ text: string; embedding: number[] }>>

// src/lib/rag/embeddings.ts
export async function embedText(text: string): Promise<number[]>
export async function searchVectors(props: {
  embedding: number[];
  kbId: string;
  topK: number;
}): Promise<Array<{ content: string; fileName: string; similarity: number }>>

// src/lib/rag/generation.ts
export async function generateAnswer(
  prompt: string,
  options?: { stream?: boolean }
): Promise<AsyncIterable<any>>
```

---

*文档版本：v1.0 | 创建日期：2026-04-30*
