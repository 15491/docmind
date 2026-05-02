import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R } from '@/lib/response'

// DELETE /api/user/kbs — 清空当前用户所有知识库（级联删除文档和向量）
export const DELETE = withAuth(async (_req, _ctx, userId) => {
  await prisma.knowledgeBase.deleteMany({ where: { userId } })
  return R.noData()
})
