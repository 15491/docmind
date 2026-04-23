export const MOCK_SESSIONS = [
  { id: "s1", title: "Next.js 配置页面重定向", time: "刚刚",  count: 2,    group: "今天" },
  { id: "s2", title: "RAG 向量检索原理",       time: "2 小时前", count: null, group: "今天" },
  { id: "s3", title: "Vercel 部署常见问题",    time: "昨天",  count: 3,    group: "昨天" },
  { id: "s4", title: "pgvector 索引优化",      time: "昨天",  count: null, group: "昨天" },
]

export const MOCK_KB_INFO: Record<string, { name: string; docCount: number }> = {
  "1": { name: "技术文档知识库", docCount: 3 },
  "2": { name: "学习笔记", docCount: 7 },
}

export const SUGGESTIONS = [
  "这份文档的核心内容是什么？",
  "帮我总结一下主要知识点",
  "有哪些需要注意的关键细节？",
]
