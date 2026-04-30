import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyCode } from "@/lib/verify-code"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "请求格式错误" }, { status: 400 })

  const { name, email, password, code } = body as Record<string, unknown>

  if (!name || typeof name !== "string" || name.trim().length === 0)
    return NextResponse.json({ error: "请填写昵称" }, { status: 422 })

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 422 })

  if (!password || typeof password !== "string" || password.length < 8)
    return NextResponse.json({ error: "密码至少 8 位" }, { status: 422 })

  if (!code || typeof code !== "string")
    return NextResponse.json({ error: "请输入验证码" }, { status: 422 })

  const result = await verifyCode("register", email, code)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name: name.trim(), email, passwordHash, emailVerified: new Date() },
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
