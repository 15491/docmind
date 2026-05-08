import { prisma } from '@/lib/prisma'
import { getPresignedUrl } from '@/lib/minio'
import { Err, R } from '@/lib/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (_req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        storageKey: true,
        knowledgeBaseId: true,
        knowledgeBase: { select: { userId: true } },
      },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权访问该文档')
    if (!document.storageKey) return Err.notFound('文档文件不存在')

    const presignedUrl = await getPresignedUrl(document.storageKey, 3600)
    return R.ok({ url: presignedUrl, documentId: document.id })
  } catch (error) {
    console.error('[/api/files/[id]] Error:', error)
    return Err.internal('获取文件失败')
  }
})
