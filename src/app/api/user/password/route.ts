import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/user/password — 修改密码（需要验证旧密码）
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { oldPassword, newPassword } = await req.json()
  if (!oldPassword || !newPassword)
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  if (newPassword.length < 8)
    return NextResponse.json({ error: '新密码至少 8 位' }, { status: 422 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user?.passwordHash)
    return NextResponse.json({ error: '该账号通过第三方登录，无法修改密码' }, { status: 422 })

  const valid = await bcrypt.compare(oldPassword, user.passwordHash)
  if (!valid) return NextResponse.json({ error: '当前密码不正确' }, { status: 422 })

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
