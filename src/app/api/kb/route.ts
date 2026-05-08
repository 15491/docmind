import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, parseJsonBody, validateSearchParams } from '@/lib/validate-request'
import { createKbSchema, kbListQuerySchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, _ctx, userId) => {
  try {
    const query = validateSearchParams(req.nextUrl.searchParams, kbListQuerySchema)
    if (isValidationErrorResponse(query)) return query

    const { pageSize, page: requestedPage } = query
    const total = await prisma.knowledgeBase.count({ where: { userId } })

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages)
    const skip = totalPages === 0 ? 0 : (page - 1) * pageSize

    const kbs = await prisma.knowledgeBase.findMany({
      where: { userId },
      include: { _count: { select: { documents: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: pageSize,
    })

    return R.ok({
      kbs: kbs.map((kb) => ({
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        createdAt: kb.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages,
    })
  } catch (error) {
    console.error('[/api/kb GET] Error:', error)
    return Err.internal('获取知识库列表失败')
  }
})

export const POST = withAuth(async (req, _ctx, userId) => {
  try {
    const body = await parseJsonBody(req, createKbSchema)
    if (isValidationErrorResponse(body)) return body

    const kb = await prisma.knowledgeBase.create({
      data: { name: body.name, userId },
    })

    return R.created({
      kb: {
        id: kb.id,
        name: kb.name,
        documentCount: 0,
        createdAt: kb.createdAt,
      },
    })
  } catch (error) {
    console.error('[/api/kb POST] Error:', error)
    return Err.internal('创建知识库失败')
  }
})
