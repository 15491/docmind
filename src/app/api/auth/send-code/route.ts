import { NextRequest } from "next/server"
import { sendVerifyCode, type VerifyPurpose } from "@/lib/verify-code"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { R, Err } from "@/lib/response"

const VALID_PURPOSES: VerifyPurpose[] = ["register", "reset-password", "change-email"]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { email, purpose } = (body ?? {}) as Record<string, unknown>

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Err.invalid("邮箱格式不正确")

  if (!purpose || !VALID_PURPOSES.includes(purpose as VerifyPurpose))
    return Err.invalid("参数错误")

  // 每个邮箱每小时最多发 5 次（在 verify-code 60s 冷却之外的全局上限）
  const { ok } = await rateLimit(`rl:send-code:${email}`, 5, 3600)
  if (!ok)
    return Err.tooMany("发送过于频繁，请稍后再试")

  if (purpose === "register") {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return Err.conflict("该邮箱已注册")
  }

  if (purpose === "reset-password") {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (!existing) return Err.notFound("该邮箱未注册")
  }

  if (purpose === "change-email") {
    const session = await auth()
    if (!session?.user?.id)
      return Err.unauthorized()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return Err.conflict("该邮箱已被其他账户使用")
  }

  try {
    await sendVerifyCode(purpose as VerifyPurpose, email)
    return R.noData()
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "COOLDOWN")
      return Err.tooMany(err.message)
    console.error("[send-code]", err instanceof Error ? err.message : String(err))
    return Err.internal("发送失败，请稍后重试")
  }
}
