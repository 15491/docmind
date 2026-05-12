import { cleanupDocumentArtifacts } from '@/lib/document/document-cleanup'
import { deleteDocumentById } from '@/lib/document/document-route-core'
import { prisma } from '@/lib/infra/prisma'
import {
  cancelDocumentProcessingJobs,
  clearDocumentCancellationRequests,
} from '@/lib/infra/queue'
import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/http/validate-request'
import { idParamSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

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

const deleteDocumentDeps = {
  findDocument: (documentId: string) => prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, storageKey: true, knowledgeBase: { select: { userId: true } } },
  }),
  cancelDocumentProcessingJobs,
  cleanupDocumentArtifacts,
  clearDocumentCancellationRequests,
  deleteDocument: async (documentId: string) => {
    await prisma.document.delete({ where: { id: documentId } })
  },
}

export const DELETE = withAuth(async (_req, ctx, userId) => {
  const params = await validateRouteParams(ctx.params, idParamSchema)
  if (isValidationErrorResponse(params)) return params

  return deleteDocumentById(params.id, userId, deleteDocumentDeps)
})
