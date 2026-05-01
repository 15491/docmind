import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, accounts: { select: { provider: true } } },
  })

  if (!user) return NextResponse.json({ status: "not_found" })
  if (user.passwordHash) return NextResponse.json({ status: "password" })
  if (user.accounts.length > 0)
    return NextResponse.json({ status: "oauth", providers: user.accounts.map((a) => a.provider) })

  return NextResponse.json({ status: "not_found" })
}
