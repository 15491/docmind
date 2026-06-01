import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { hash, compare } from 'bcryptjs'
import { prisma } from '@/lib/infra/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL,

  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => hash(password, 10),
      verify: ({ hash: h, password }) => compare(password, h),
    },
  },

  socialProviders: {
    github: {
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    },
    google: {
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['github', 'google'],
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  // 使用 Better Auth 内置限流保护 sign-in 端点
  rateLimit: {
    enabled: true,
    customRules: {
      '/sign-in/email': {
        window: 600, // 10 分钟
        max: 10,     // IP 每 10 分钟最多 10 次
      },
    },
  },
})

export type Auth = typeof auth
export type Session = typeof auth.$Infer.Session
