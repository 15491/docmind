import type { Message } from "../types"

export const SESSION_HISTORY: Record<string, Message[]> = {
  s1: [
    { id: "1", role: "user", content: "Next.js 14 中如何配置页面重定向？" },
    {
      id: "2",
      role: "assistant",
      content: "在 Next.js 14 中，重定向有两种主要配置方式：\n\n**方式一：静态配置** — 在 next.config.js 的 redirects() 中声明固定跳转规则。\n\n**方式二：Middleware 动态跳转** — 在 middleware.ts 中按条件动态决定跳转目标，运行在 Edge Runtime。",
      sources: [{ name: "api-doc.pdf", chunk: 3 }, { name: "guide.txt", chunk: 7 }],
    },
    { id: "3", role: "user", content: "那如何做未登录用户自动跳转到 /login？" },
    {
      id: "4",
      role: "assistant",
      content: "在 middleware.ts 中读取认证 Cookie，未登录则重定向并附带回跳路径。这样用户登录后可以自动返回原来想访问的页面，提升用户体验。",
      sources: [{ name: "api-doc.pdf", chunk: 5 }],
    },
  ],
  s2: [
    { id: "1", role: "user", content: "RAG 的核心原理是什么？" },
    {
      id: "2",
      role: "assistant",
      content: "RAG（检索增强生成）的核心原理：先将文档分块并向量化存储，提问时检索最相关的 Top-K 片段，再将这些片段作为上下文传给 LLM 生成回答，从而基于真实文档内容回答，避免模型幻觉。",
      sources: [{ name: "notes.md", chunk: 2 }],
    },
  ],
}

export const SESSION_TITLES: Record<string, string> = {
  s1: "Next.js 配置页面重定向",
  s2: "RAG 向量检索原理",
  s3: "Vercel 部署常见问题",
  s4: "pgvector 索引优化",
}
