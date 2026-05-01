import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { R, Err } from "@/lib/response"

export async function POST(req: NextRequest) {
  const { ok } = await rateLimit(`rl:check-email:${req.headers.get("x-forwarded-for") ?? "unknown"}`, 20, 60)
  if (!ok) return Err.tooMany("操作过于频繁，请稍后再试")

  const { email } = await req.json() as { email?: string }
  if (!email) return Err.invalid("Missing email")

  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, accounts: { select: { provider: true } } },
  })

  if (!user) return R.ok({ status: "not_found" })
  if (user.passwordHash) return R.ok({ status: "password" })
  if (user.accounts.length > 0)
    return R.ok({ status: "oauth", providers: user.accounts.map((a) => a.provider) })

  return R.ok({ status: "not_found" })
}
