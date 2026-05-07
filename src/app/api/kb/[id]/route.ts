import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { Err, R } from '@/lib/response'

export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const { id } = await ctx.params

    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: { _count: { select: { documents: true } } },
    })

    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权访问此知识库')

    return R.ok({
      kb: {
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        createdAt: kb.createdAt,
      },
    })
  } catch (error) {
    console.error('[/api/kb/[id] GET] Error:', error)
    return Err.internal('获取知识库失败')
  }
})

export const PATCH = withAuth(async (req, ctx, userId) => {
  try {
    const { id } = await ctx.params
    const body = await req.json() as { name?: string }
    const name = body.name?.trim()

    if (!name) return Err.invalid('知识库名称不能为空')
    if (name.length < 2) return Err.invalid('知识库名称至少需要 2 个字符')
    if (name.length > 100) return Err.invalid('知识库名称不能超过 100 个字符')

    const existingKb = await prisma.knowledgeBase.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!existingKb) return Err.notFound('知识库不存在')
    if (existingKb.userId !== userId) return Err.forbidden('无权修改此知识库')

    const kb = await prisma.knowledgeBase.update({
      where: { id },
      data: { name },
      include: { _count: { select: { documents: true } } },
    })

    return R.ok({
      kb: {
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        createdAt: kb.createdAt,
      },
    })
  } catch (error) {
    console.error('[/api/kb/[id] PATCH] Error:', error)
    return Err.internal('更新知识库失败')
  }
})

export const DELETE = withAuth(async (_req, ctx, userId) => {
  try {
    const { id } = await ctx.params

    const kb = await prisma.knowledgeBase.findUnique({ where: { id } })

    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权删除此知识库')

    await prisma.knowledgeBase.delete({ where: { id } })

    return R.noData()
  } catch (error) {
    console.error('[/api/kb/[id] DELETE] Error:', error)
    return Err.internal('删除知识库失败')
  }
})
