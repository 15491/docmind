import type { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

// Lightweight config — no PrismaAdapter, safe to import in Edge Runtime (middleware)
export const authConfig: NextAuthConfig = {
  providers: [GitHub, Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth
    },
  },
}
