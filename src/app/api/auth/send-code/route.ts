import { NextRequest, NextResponse } from "next/server"
import { sendVerifyCode, type VerifyPurpose } from "@/lib/verify-code"
import { prisma } from "@/lib/prisma"

const VALID_PURPOSES: VerifyPurpose[] = ["register", "reset-password"]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const { email, purpose } = (body ?? {}) as Record<string, unknown>

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "邮箱格式不正确" }, { status: 422 })

  if (!purpose || !VALID_PURPOSES.includes(purpose as VerifyPurpose))
    return NextResponse.json({ error: "参数错误" }, { status: 422 })

  if (purpose === "register") {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 })
  }

  if (purpose === "reset-password") {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (!existing) return NextResponse.json({ error: "该邮箱未注册" }, { status: 404 })
  }

  try {
    await sendVerifyCode(purpose as VerifyPurpose, email)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "COOLDOWN")
      return NextResponse.json({ error: err.message }, { status: 429 })
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[send-code]", msg)
    return NextResponse.json({ error: `发送失败：${msg}` }, { status: 500 })
  }
}
