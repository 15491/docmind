import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/with-auth'
import { R, Err } from '@/lib/response'

// GET /api/kb/[id] — 获取知识库详情
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
    console.error('[/api/kb GET] Error:', error)
    return Err.internal('获取知识库失败')
  }
})

// DELETE /api/kb/[id] — 删除知识库（级联删除文档和chunks）
export const DELETE = withAuth(async (_req, ctx, userId) => {
  try {
    const { id } = await ctx.params

    const kb = await prisma.knowledgeBase.findUnique({ where: { id } })

    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权删除此知识库')

    await prisma.knowledgeBase.delete({ where: { id } })

    return R.noData()
  } catch (error) {
    console.error('[/api/kb DELETE] Error:', error)
    return Err.internal('删除知识库失败')
  }
})
