import { prisma } from '@/lib/prisma'
import { deleteDocumentChunks } from '@/lib/elasticsearch'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/validate-request'
import { batchDeleteDocumentsSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const body = await parseJsonBody(req, batchDeleteDocumentsSchema)
    if (isValidationErrorResponse(body)) return body

    const { ids } = body
    const documents = await prisma.document.findMany({
      where: { id: { in: ids } },
      select: { id: true, knowledgeBase: { select: { userId: true } } },
    })

    if (documents.length !== ids.length) return Err.notFound('部分文档不存在')

    for (const document of documents) {
      if (document.knowledgeBase.userId !== userId) {
        return Err.forbidden('无权删除部分文档')
      }
    }

    for (const id of ids) {
      try {
        await deleteDocumentChunks(id)
      } catch (error) {
        console.error(`[batch-delete] ES cleanup failed for doc ${id}:`, error)
      }
    }

    await prisma.document.deleteMany({ where: { id: { in: ids } } })
    return R.ok({ deleted: ids.length })
  } catch (error) {
    console.error('[/api/documents/batch-delete] Error:', error)
    return Err.internal('批量删除失败')
  }
})
