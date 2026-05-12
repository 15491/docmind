import { cleanupDocumentArtifacts } from '@/lib/document/document-cleanup'
import { prisma } from '@/lib/infra/prisma'
import {
  cancelDocumentProcessingJobs,
  clearDocumentCancellationRequests,
} from '@/lib/infra/queue'
import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { batchDeleteDocumentsSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const body = await parseJsonBody(req, batchDeleteDocumentsSchema)
    if (isValidationErrorResponse(body)) return body

    const { ids } = body
    const documents = await prisma.document.findMany({
      where: { id: { in: ids } },
      select: { id: true, storageKey: true, knowledgeBase: { select: { userId: true } } },
    })

    if (documents.length !== ids.length) return Err.notFound('部分文档不存在')

    for (const document of documents) {
      if (document.knowledgeBase.userId !== userId) {
        return Err.forbidden('无权删除部分文档')
      }
    }

    try {
      await cancelDocumentProcessingJobs(ids)
      await cleanupDocumentArtifacts(documents.map((document) => ({
        id: document.id,
        storageKey: document.storageKey,
      })))
      await prisma.document.deleteMany({ where: { id: { in: ids } } })
    } catch (error) {
      await clearDocumentCancellationRequests(ids).catch(() => {})
      throw error
    }

    return R.ok({ deleted: ids.length })
  } catch (error) {
    console.error('[/api/documents/batch-delete] Error:', error)
    return Err.internal('批量删除失败')
  }
})
