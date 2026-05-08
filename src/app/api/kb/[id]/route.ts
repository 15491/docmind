import { cleanupDocumentArtifacts } from '@/lib/document-cleanup'
import { prisma } from '@/lib/prisma'
import { Err, R } from '@/lib/response'
import {
  isValidationErrorResponse,
  parseJsonBody,
  validateRouteParams,
} from '@/lib/validate-request'
import { createKbSchema, idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const { id } = params
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
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const body = await parseJsonBody(req, createKbSchema)
    if (isValidationErrorResponse(body)) return body

    const existingKb = await prisma.knowledgeBase.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })

    if (!existingKb) return Err.notFound('知识库不存在')
    if (existingKb.userId !== userId) return Err.forbidden('无权修改此知识库')

    const kb = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: { name: body.name },
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
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const kb = await prisma.knowledgeBase.findUnique({ where: { id: params.id } })
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权删除此知识库')

    const documents = await prisma.document.findMany({
      where: { knowledgeBaseId: params.id },
      select: { id: true, storageKey: true },
    })

    await cleanupDocumentArtifacts(documents)
    await prisma.knowledgeBase.delete({ where: { id: params.id } })
    return R.noData()
  } catch (error) {
    console.error('[/api/kb/[id] DELETE] Error:', error)
    return Err.internal('删除知识库失败')
  }
})
