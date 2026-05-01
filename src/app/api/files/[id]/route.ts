import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPresignedUrl } from '@/lib/minio'
import { R, Err } from '@/lib/response'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const { id: documentId } = await params

    // 获取文档，验证归属权
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        storageKey: true,
        knowledgeBaseId: true,
        knowledgeBase: { select: { userId: true } },
      },
    })

    if (!document) {
      return Err.notFound('文档不存在')
    }

    if (document.knowledgeBase.userId !== session.user.id) {
      return Err.forbidden('无权访问该文档')
    }

    if (!document.storageKey) {
      return Err.notFound('文档文件不存在')
    }

    // 获取预签名 URL（1 小时有效期）
    const presignedUrl = await getPresignedUrl(document.storageKey, 3600)

    return R.ok({
      url: presignedUrl,
      documentId: document.id,
    })
  } catch (error) {
    console.error('[/api/files/[id]] Error:', error)
    return Err.internal('获取文件失败')
  }
}
