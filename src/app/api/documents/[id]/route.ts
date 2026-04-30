import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/documents/[id] — 删除文档
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    // 获取文档，验证归属权
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        knowledgeBase: true,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: '文档不存在' },
        { status: 404 }
      )
    }

    if (document.knowledgeBase.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '无权删除此文档' },
        { status: 403 }
      )
    }

    // 删除文档（级联删除 chunks）
    await prisma.document.delete({
      where: { id: documentId },
    })

    return NextResponse.json({
      message: '文档已删除',
    })
  } catch (error) {
    console.error('[/api/documents/[id]] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '删除文档失败' },
      { status: 500 }
    )
  }
}
