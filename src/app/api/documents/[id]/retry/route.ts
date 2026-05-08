import { prisma } from '@/lib/prisma'
import { deleteDocumentChunks } from '@/lib/elasticsearch'
import { documentQueue } from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const POST = withAuth(async (_req, ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:retry:${userId}`, 10, 60)
    if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { knowledgeBase: true },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权操作此文档')
    if (document.status !== 'failed') return Err.invalid('只有处理失败的文档才能重试')
    if (!document.storageKey) return Err.invalid('文档存储路径丢失，无法重试，请重新上传')

    await deleteDocumentChunks(params.id).catch((error) => {
      console.error('[retry] Failed to delete old chunks:', error)
    })

    await prisma.documentChunk.deleteMany({ where: { documentId: params.id } })
    await prisma.document.update({
      where: { id: params.id },
      data: { status: 'processing' },
    })

    await documentQueue.add(
      'process-document',
      {
        documentId: params.id,
        knowledgeBaseId: document.knowledgeBaseId,
        userId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        objectKey: document.storageKey,
      },
      { jobId: `doc-${params.id}` }
    )

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]/retry] Error:', error)
    return Err.internal('重试失败')
  }
})
