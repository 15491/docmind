export const DOC_TABLE_HEADERS = ["文件名", "大小", "状态", "上传时间", ""]

export const MOCK_KB_NAMES: Record<string, string> = {
  "1": "技术文档知识库",
  "2": "学习笔记",
}

import type { DocStatus } from "./types"

export const MOCK_DOCS = [
  { id: "1", name: "api-doc.pdf", size: "2.3 MB", status: "ready" as DocStatus,      uploadedAt: "2 天前" },
  { id: "2", name: "notes.md",    size: "45 KB",  status: "processing" as DocStatus, uploadedAt: "1 分钟前" },
  { id: "3", name: "guide.txt",   size: "12 KB",  status: "failed" as DocStatus,     uploadedAt: "3 天前" },
]

export const MOCK_PREVIEW: Record<string, { type: "pdf" | "md" | "txt"; content: string }> = {
  "api-doc.pdf": {
    type: "pdf",
    content: `# Next.js API 文档

## 1. 页面路由与重定向

### 静态重定向（next.config.js）

在 \`next.config.js\` 中通过 \`redirects()\` 函数声明静态跳转规则，构建时确定，性能最优。

\`\`\`js
module.exports = {
  async redirects() {
    return [
      { source: '/old', destination: '/new', permanent: true },
    ]
  },
}
\`\`\`

### Middleware 动态跳转

\`middleware.ts\` 运行在 Edge Runtime，可在请求到达页面前拦截处理。

\`\`\`ts
import { NextResponse } from 'next/server'
export function middleware(request) {
  const token = request.cookies.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
\`\`\`

## 2. 数据获取

Next.js 提供多种数据获取策略：SSR、SSG、ISR 以及客户端获取。根据数据更新频率和实时性要求选择合适方式。`,
  },
  "notes.md": {
    type: "md",
    content: `# 学习笔记

## RAG 架构要点

**检索增强生成（RAG）** 是当前主流的知识库 AI 问答方案：

1. **文档预处理** — 将文档按固定 chunk 大小（500 tokens）分割，50 tokens 重叠避免上下文截断
2. **向量化** — 每个 chunk 通过 Embedding 模型转为高维向量存入 pgvector
3. **检索** — 用户提问时计算 cosine 相似度，取 Top-K 最相关片段
4. **生成** — 将检索到的片段作为上下文注入 LLM prompt，生成有据可查的回答

## pgvector 索引

\`\`\`sql
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
\`\`\`

IVFFlat 索引在百万级向量时仍能保持毫秒级查询。`,
  },
  "guide.txt": {
    type: "txt",
    content: `快速上手指南

一、上传文档
支持 PDF、Markdown（.md）、纯文本（.txt）格式。
文件大小不超过 10MB。
上传后系统自动完成解析、分块、向量化，通常需要 10-30 秒。

二、创建知识库
知识库是文档的分组容器。
建议按项目或主题分组，不同知识库的内容互相隔离。
同一知识库内的所有文档都会参与检索。

三、开始问答
进入知识库后点击「开始问答」。
每条 AI 回答会标注引用的文档和段落，便于核实。
如回答不准确，可检查文档是否已处理完成（状态：就绪）。

四、注意事项
- 文档内容越规范，检索效果越好
- 扫描版 PDF 暂不支持（需要 OCR）
- 处理失败的文档可点击重试按钮`,
  },
}

export const STATUS_MAP: Record<DocStatus, { label: string; cls: string; dot?: boolean }> = {
  ready:      { label: "就绪",   cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  processing: { label: "处理中", cls: "text-amber-700 bg-amber-50 border-amber-200", dot: true },
  failed:     { label: "失败",   cls: "text-red-600 bg-red-50 border-red-200" },
}
