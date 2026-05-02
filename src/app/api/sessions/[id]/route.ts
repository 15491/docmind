import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'

// DELETE /api/sessions/[id] — 删除会话及其所有消息
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Err.unauthorized()

    const { id } = await params

    const chatSession = await prisma.chatSession.findUnique({
      where: { id },
      include: { knowledgeBase: { select: { userId: true } } },
    })

    if (!chatSession) return Err.notFound('会话不存在')
    if (chatSession.knowledgeBase.userId !== session.user.id) return Err.forbidden('无权删除此会话')

    await prisma.chatSession.delete({ where: { id } })

    return R.ok({ id })
  } catch (error) {
    console.error('[DELETE /api/sessions/[id]] Error:', error)
    return Err.internal('删除会话失败')
  }
}
