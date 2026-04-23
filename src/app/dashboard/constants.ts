import type { Kb, RecentSession } from "./types"

export const MOCK_KBS: Kb[] = [
  { id: "1", name: "技术文档知识库", docCount: 3, updatedAt: "2 天前" },
  { id: "2", name: "学习笔记",       docCount: 7, updatedAt: "1 天前" },
]

export const RECENT_SESSIONS: RecentSession[] = [
  { id: "s1", kbId: "1", kbName: "技术文档知识库", title: "Next.js 配置页面重定向", time: "刚刚" },
  { id: "s2", kbId: "1", kbName: "技术文档知识库", title: "RAG 向量检索原理",       time: "2 小时前" },
  { id: "s3", kbId: "2", kbName: "学习笔记",       title: "Vercel 部署常见问题",    time: "昨天" },
]
