import { Readable } from 'node:stream'
import { getFileStream } from '@/lib/minio'
import { prisma } from '@/lib/prisma'
import { Err } from '@/lib/response'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

function encodeContentDispositionFilename(fileName: string) {
  return encodeURIComponent(fileName).replace(/['()*]/g, (char) => (
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  ))
}

function buildContentDisposition(fileName: string, download: boolean) {
  const type = download ? 'attachment' : 'inline'
  const fallback = fileName
    .replace(/[^\x20-\x7E]+/g, '_')
    .replace(/["\\]/g, '_')
    .trim() || 'file'

  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeContentDispositionFilename(fileName)}`
}

export const GET = withAuth(async (req, ctx, userId) => {
  try {
    const params = await validateRouteParams(ctx.params, idParamSchema)
    if (isValidationErrorResponse(params)) return params

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        storageKey: true,
        knowledgeBase: { select: { userId: true } },
      },
    })

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权访问该文档')
    if (!document.storageKey) return Err.notFound('文档文件不存在')

    const download = req.nextUrl.searchParams.get('download') === '1'
    const stream = await getFileStream(document.storageKey)

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        'Content-Type': document.mimeType || 'application/octet-stream',
        'Content-Length': String(document.fileSize),
        'Content-Disposition': buildContentDisposition(document.fileName, download),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[/api/files/[id]] Error:', error)
    return Err.internal('获取文件失败')
  }
})
