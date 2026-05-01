import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyCode } from '@/lib/verify-code'

export async function POST(req: Request) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 422 })
  }

  const result = await verifyCode('reset-password', email, code)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: '账号不存在' }, { status: 404 })
  }

  // OAuth 账号没有密码，不能通过此流程重置
  if (!user.passwordHash) {
    return NextResponse.json(
      { error: '该账号通过第三方登录，无法设置密码' },
      { status: 422 }
    )
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { email }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
