import { prisma } from '@/lib/prisma'
import { documentQueue } from '@/lib/queue'
import { deleteDocumentChunks } from '@/lib/elasticsearch'
import { rateLimit } from '@/lib/rate-limit'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

// POST /api/documents/[id]/retry — 重新处理失败文档
export const POST = withAuth(async (_req, ctx, userId) => {
  try {
    const { ok } = await rateLimit(`rl:retry:${userId}`, 10, 60)
    if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

    const { id: documentId } = await ctx.params

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { knowledgeBase: true },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权操作此文档')
    if (document.status !== 'failed') return Err.invalid('只有处理失败的文档才能重试')
    if (!document.storageKey) return Err.invalid('文档存储路径丢失，无法重试，请重新上传')

    await deleteDocumentChunks(documentId).catch((err) => {
      console.error('[retry] Failed to delete old chunks:', err)
    })

    await prisma.documentChunk.deleteMany({ where: { documentId } })

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    })

    await documentQueue.add(
      'process-document',
      {
        documentId,
        knowledgeBaseId: document.knowledgeBaseId,
        userId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        objectKey: document.storageKey,
      },
      { jobId: `doc-${documentId}` }
    )

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]/retry] Error:', error)
    return Err.internal('重试失败')
  }
})
