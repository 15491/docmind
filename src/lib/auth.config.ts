import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

// Lightweight config — no PrismaAdapter, safe to use in proxy (middleware)
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({ allowDangerousEmailAccountLinking: true }),
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // 将 token.sub 映射到 session.user.id，供 proxy 中 req.auth?.user?.id 使用
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
}
