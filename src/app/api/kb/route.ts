import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { R, Err } from '@/lib/response'

// GET /api/kb — 获取用户的所有知识库
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const kbs = await prisma.knowledgeBase.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return R.ok({
      kbs: kbs.map(kb => ({
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        createdAt: kb.createdAt,
      })),
    })
  } catch (error) {
    console.error('[/api/kb GET] Error:', error)
    return Err.internal('获取知识库列表失败')
  }
}

// POST /api/kb — 创建新知识库
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Err.unauthorized()
    }

    const body = await req.json() as { name?: string }
    const name = body.name?.trim()

    if (!name) {
      return Err.invalid('知识库名称不能为空')
    }

    if (name.length > 100) {
      return Err.invalid('知识库名称过长')
    }

    const kb = await prisma.knowledgeBase.create({
      data: {
        name,
        userId: session.user.id,
      },
    })

    return R.created({
      kb: {
        id: kb.id,
        name: kb.name,
        documentCount: 0,
        createdAt: kb.createdAt,
      },
    })
  } catch (error) {
    console.error('[/api/kb POST] Error:', error)
    return Err.internal('创建知识库失败')
  }
}
