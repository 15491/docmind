import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyCode } from "@/lib/verify-code"
import { R, Err } from "@/lib/response"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return Err.invalid("请求格式错误")

  const { name, email, password, code } = body as Record<string, unknown>

  if (!name || typeof name !== "string" || name.trim().length === 0)
    return Err.invalid("请填写昵称")

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Err.invalid("邮箱格式不正确")

  if (!password || typeof password !== "string" || password.length < 8)
    return Err.invalid("密码至少 8 位")

  if (!code || typeof code !== "string")
    return Err.invalid("请输入验证码")

  const result = await verifyCode("register", email, code)
  if (!result.ok) return Err.invalid(result.error)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return Err.conflict("该邮箱已注册")

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name: name.trim(), email, passwordHash, emailVerified: new Date() },
  })

  return R.noData()
}
