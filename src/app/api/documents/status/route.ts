import { prisma } from '@/lib/infra/prisma'
import { getCreatedAtDescCursorOrderBy } from '@/lib/http/cursor-pagination'
import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, validateSearchParams } from '@/lib/http/validate-request'
import { documentsStatusQuerySchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

export const GET = withAuth(async (req, _ctx, userId) => {
  try {
    const query = validateSearchParams(req.nextUrl.searchParams, documentsStatusQuerySchema)
    if (isValidationErrorResponse(query)) return query

    const { kbId, cursor, limit } = query
    const kb = await prisma.knowledgeBase.findUnique({ where: { id: kbId } })
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

    const documents = await prisma.document.findMany({
      where: { knowledgeBaseId: kbId },
      include: { _count: { select: { chunks: true } } },
      orderBy: getCreatedAtDescCursorOrderBy(),
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = documents.length > limit
    const page = hasMore ? documents.slice(0, limit) : documents
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return R.ok({
      documents: page.map((document) => ({
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        chunkCount: document._count.chunks,
        createdAt: document.createdAt,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error('[/api/documents/status] Error:', error)
    return Err.internal('查询文档状态失败')
  }
})
