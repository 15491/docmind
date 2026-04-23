import type { SearchResult } from "./types"

export const MOCK_RESULTS: SearchResult[] = [
  {
    id: "1",
    docName: "api-doc.pdf",
    kbName: "技术文档知识库",
    kbId: "1",
    chunk: 3,
    score: 0.94,
    content:
      "在 Next.js 中，redirects() 函数定义在 next.config.js 中，返回一个包含 source、destination 和 permanent 字段的数组。permanent 为 true 时使用 308 状态码，false 时使用 307 状态码，适用于临时跳转场景。",
  },
  {
    id: "2",
    docName: "guide.txt",
    kbName: "技术文档知识库",
    kbId: "1",
    chunk: 7,
    score: 0.89,
    content:
      "Middleware 运行在 Edge Runtime，可以在请求到达页面之前拦截并重定向。使用 NextResponse.redirect() 方法，可以将未登录用户重定向至 /login，同时保留原始请求路径作为回跳参数。",
  },
  {
    id: "3",
    docName: "notes.md",
    kbName: "学习笔记",
    kbId: "2",
    chunk: 2,
    score: 0.81,
    content:
      "RAG（检索增强生成）架构中，文档首先被分割为固定大小的 chunk，每个 chunk 通过 embedding 模型转换为向量后存入 pgvector。查询时计算余弦相似度，取 Top-K 结果作为上下文注入 LLM 提示词。",
  },
]

export const RECENT_SEARCHES = ["Next.js 重定向配置", "pgvector 索引", "RAG 向量检索"]
