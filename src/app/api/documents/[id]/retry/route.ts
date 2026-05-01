import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { documentQueue } from '@/lib/queue'
import { deleteDocumentChunks } from '@/lib/elasticsearch'
import { R, Err } from '@/lib/response'

// POST /api/documents/[id]/retry — 重新处理失败文档
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const { id: documentId } = await params

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { knowledgeBase: true },
    })

    if (!document) {
      return Err.notFound('文档不存在')
    }

    if (document.knowledgeBase.userId !== session.user.id) {
      return Err.forbidden('无权操作此文档')
    }

    if (document.status !== 'failed') {
      return Err.invalid('只有处理失败的文档才能重试')
    }

    if (!document.storageKey) {
      return Err.invalid('文档存储路径丢失，无法重试，请重新上传')
    }

    // 清除旧的 Elasticsearch chunks，避免重试后产生重复向量
    await deleteDocumentChunks(documentId).catch((err) => {
      console.error('[retry] Failed to delete old chunks:', err)
    })

    // 同时清除 PostgreSQL 中残留的旧 chunks
    await prisma.documentChunk.deleteMany({ where: { documentId } })

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    })

    await documentQueue.add('process-document', {
      documentId,
      knowledgeBaseId: document.knowledgeBaseId,
      userId: session.user.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      objectKey: document.storageKey,
    })

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]/retry] Error:', error)
    return Err.internal('重试失败')
  }
}
