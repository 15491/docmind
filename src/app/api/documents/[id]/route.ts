import { cleanupDocumentArtifacts } from '@/lib/document-cleanup'
import { prisma } from '@/lib/prisma'
import {
  cancelDocumentProcessingJobs,
  clearDocumentCancellationRequests,
} from '@/lib/queue'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { chunks: true } },
        knowledgeBase: { select: { userId: true } },
      },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权访问该文档')

    return R.ok({
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        chunkCount: document._count.chunks,
        createdAt: document.createdAt,
        knowledgeBaseId: document.knowledgeBaseId,
      },
    })
  } catch (error) {
    console.error('[/api/documents/[id]] GET Error:', error)
    return Err.internal('获取文档失败')
  }
})

export const DELETE = withAuth(async (_req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { id: true, storageKey: true, knowledgeBase: { select: { userId: true } } },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权删除该文档')

    const documentIds = [document.id]

    try {
      await cancelDocumentProcessingJobs(documentIds)
      await cleanupDocumentArtifacts([{ id: document.id, storageKey: document.storageKey }])
      await prisma.document.delete({ where: { id: params.id } })
    } catch (error) {
      await clearDocumentCancellationRequests(documentIds).catch(() => {})
      throw error
    }

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]] DELETE Error:', error)
    return Err.internal('删除文档失败')
  }
})
