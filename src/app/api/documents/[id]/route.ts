import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'
import { deleteDocumentChunks } from '@/lib/elasticsearch'

// DELETE /api/documents/[id] — 删除文档
export async function DELETE(
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
      select: { id: true, knowledgeBase: { select: { userId: true } } },
    })

    if (!document) {
      return Err.notFound('文档不存在')
    }

    if (document.knowledgeBase.userId !== session.user.id) {
      return Err.forbidden('无权删除此文档')
    }

    // 清除 Elasticsearch 中的向量数据
    try {
      await deleteDocumentChunks(documentId)
    } catch (err) {
      console.error('[DELETE document] ES cleanup failed:', err)
      // 继续执行 PG 删除，不阻断流程
    }

    // deleteMany 不抛 P2025，规避 worker 与删除请求之间的竞争条件
    await prisma.document.deleteMany({ where: { id: documentId } })

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]] Error:', error)
    return Err.internal('删除文档失败')
  }
}
