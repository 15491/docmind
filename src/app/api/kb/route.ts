import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { Err, R } from '@/lib/response'

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 48

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return parsed
}

export const GET = withAuth(async (req, _ctx, userId) => {
  try {
    const pageSize = Math.min(
      parsePositiveInt(req.nextUrl.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    )
    const requestedPage = parsePositiveInt(req.nextUrl.searchParams.get('page'), 1)

    const total = await prisma.knowledgeBase.count({
      where: { userId },
    })

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
    const body = await req.json() as { name?: string }
    const name = body.name?.trim()

    if (!name) return Err.invalid('知识库名称不能为空')
    if (name.length > 100) return Err.invalid('知识库名称不能超过 100 个字符')

    const kb = await prisma.knowledgeBase.create({
      data: { name, userId },
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
