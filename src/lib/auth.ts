import NextAuth, { type DefaultSession, CredentialsSignin } from "next-auth"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { JWT } from "next-auth/jwt"
import Credentials from "next-auth/providers/credentials"
import { limitCredentialsSignInRequest } from "./auth-rate-limit"

class OAuthOnlyAccount extends CredentialsSignin {
  code = "oauth_only"
}
class RateLimitedCredentialsSignin extends CredentialsSignin {
  code = "rate_limited"
}
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { authConfig } from "./auth.config"
import { authorizeCredentialsWithRateLimitDeps } from "./credentials-auth-core"

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
      async authorize(credentials, request) {
        const result = await authorizeCredentialsWithRateLimitDeps(credentials, request, {
          limitSignInAttempt: (req, email) => limitCredentialsSignInRequest(req, email),
          comparePassword: bcrypt.compare,
          findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
        })

        if (result === 'rate_limited') {
          throw new RateLimitedCredentialsSignin()
        }

        if (result === 'oauth_only') {
          throw new OAuthOnlyAccount()
        }

        return result
      },
    }),
  ],
})
