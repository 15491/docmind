import { cleanupDocumentArtifacts } from '@/lib/document-cleanup'
import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { withAuth } from '@/lib/with-auth'

export const DELETE = withAuth(async (_req, _ctx, userId) => {
  try {
    const documents = await prisma.document.findMany({
      where: { knowledgeBase: { userId } },
      select: { id: true, storageKey: true },
    })

    await cleanupDocumentArtifacts(documents)
    await prisma.knowledgeBase.deleteMany({ where: { userId } })
    return R.noData()
  } catch (error) {
    console.error('[/api/user/kbs] DELETE Error:', error)
    return Err.internal('清空知识库失败')
  }
})
