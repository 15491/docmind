import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

// Lightweight config — no PrismaAdapter, safe to import in Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  providers: [
    // 邮箱均经过平台强制验证，允许自动关联已有邮箱账号
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
