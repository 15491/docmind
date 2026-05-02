import NextAuth, { type DefaultSession, CredentialsSignin } from "next-auth"
import type { JWT } from "next-auth/jwt"
import Credentials from "next-auth/providers/credentials"

class OAuthOnlyAccount extends CredentialsSignin {
  code = "oauth_only"
}
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { authConfig } from "./auth.config"
import { createSessionVersion, getSessionVersion } from "./session-version"

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null
        if (!user.passwordHash) throw new OAuthOnlyAccount()

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, image: user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        // 新登录：生成版本号写入 Redis 和 JWT，踢出其他设备
        token.sub = user.id
        token.sessionVersion = await createSessionVersion(user.id)
        return token
      }

      // 已有 token：校验版本号是否仍有效
      if (token.sub && token.sessionVersion) {
        const current = await getSessionVersion(token.sub)
        if (current !== token.sessionVersion) {
          // 版本不一致：该 token 已被新登录踢出，清空 sub 使 session 失效
          return { ...token, sub: undefined, sessionVersion: undefined }
        }
      }

      return token
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      } else {
        // sub 已被清空，返回无 user.id 的 session，API 层视为未登录
        session.user = {} as typeof session.user
      }
      return session
    },
  },
})
