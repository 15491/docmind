import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { Err, R } from '@/lib/response'
import { deleteDocumentChunks } from '@/lib/elasticsearch'

export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const { id: documentId } = await ctx.params

    const document = await prisma.document.findUnique({
      where: { id: documentId },
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
    const { id: documentId } = await ctx.params

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, knowledgeBase: { select: { userId: true } } },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权删除该文档')

    try {
      await deleteDocumentChunks(documentId)
    } catch (err) {
      console.error('[DELETE document] ES cleanup failed:', err)
    }

    await prisma.document.deleteMany({ where: { id: documentId } })

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]] DELETE Error:', error)
    return Err.internal('删除文档失败')
  }
})
