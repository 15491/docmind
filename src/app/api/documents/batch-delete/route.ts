import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteDocumentChunks } from '@/lib/elasticsearch'
import { R, Err } from '@/lib/response'

// POST /api/documents/batch-delete — 批量删除文档
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const { ids } = (await req.json()) as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return Err.invalid('ids 必须是非空数组')
    }

    // 验证所有文档都属于当前用户
    const documents = await prisma.document.findMany({
      where: { id: { in: ids } },
      select: { id: true, knowledgeBase: { select: { userId: true } } },
    })

    if (documents.length !== ids.length) {
      return Err.notFound('部分文档不存在')
    }

    for (const doc of documents) {
      if (doc.knowledgeBase.userId !== session.user.id) {
        return Err.forbidden('您无权删除部分文档')
      }
    }

    // 清除 Elasticsearch 中的向量数据（容错处理）
    for (const id of ids) {
      try {
        await deleteDocumentChunks(id)
      } catch (err) {
        console.error(`[batch-delete] ES cleanup failed for doc ${id}:`, err)
      }
    }

    // 删除文档（PG 的 Cascade 会自动删除 chunks）
    await prisma.document.deleteMany({ where: { id: { in: ids } } })

    return R.ok({ deleted: ids.length })
  } catch (error) {
    console.error('[/api/documents/batch-delete] Error:', error)
    return Err.internal('批量删除失败')
  }
}
