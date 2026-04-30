import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/kb — 获取用户的所有知识库
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
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

    return NextResponse.json({
      kbs: kbs.map(kb => ({
        id: kb.id,
        name: kb.name,
        documentCount: kb._count.documents,
        createdAt: kb.createdAt,
      })),
    })
  } catch (error) {
    console.error('[/api/kb GET] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '获取知识库列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/kb — 创建新知识库
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const body = await req.json() as { name?: string }
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '知识库名称不能为空' },
        { status: 422 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: '知识库名称过长' },
        { status: 422 }
      )
    }

    const kb = await prisma.knowledgeBase.create({
      data: {
        name,
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      kb: {
        id: kb.id,
        name: kb.name,
        documentCount: 0,
        createdAt: kb.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[/api/kb POST] Error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '创建知识库失败' },
      { status: 500 }
    )
  }
}
