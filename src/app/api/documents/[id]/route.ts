import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'
import { deleteDocumentChunks } from '@/lib/elasticsearch'

// DELETE /api/documents/[id] — 删除文档
export const DELETE = withAuth(async (_req, ctx, userId) => {
  try {
    const { id: documentId } = await ctx.params

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, knowledgeBase: { select: { userId: true } } },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权删除此文档')

    try {
      await deleteDocumentChunks(documentId)
    } catch (err) {
      console.error('[DELETE document] ES cleanup failed:', err)
    }

    await prisma.document.deleteMany({ where: { id: documentId } })

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]] Error:', error)
    return Err.internal('删除文档失败')
  }
})
