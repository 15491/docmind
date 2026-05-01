import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/user/kbs — 清空当前用户所有知识库（级联删除文档和向量）
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  await prisma.knowledgeBase.deleteMany({ where: { userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
