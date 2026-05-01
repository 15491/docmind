import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'

// DELETE /api/user/kbs — 清空当前用户所有知识库（级联删除文档和向量）
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return Err.unauthorized()

  await prisma.knowledgeBase.deleteMany({ where: { userId: session.user.id } })

  return R.noData()
}
