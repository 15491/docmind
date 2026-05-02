import { customFetch, type NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { fetch as undiciFetch, ProxyAgent } from "undici"

const githubProxyUrl = process.env.AUTH_GITHUB_PROXY_URL?.trim()
const githubProxyDispatcher = githubProxyUrl ? new ProxyAgent(githubProxyUrl) : null

function githubProxyFetch(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
  const [input, init] = args
  return undiciFetch(input as never, {
    ...(init ?? {}),
    dispatcher: githubProxyDispatcher ?? undefined,
  } as never) as unknown as ReturnType<typeof fetch>
}

const githubProvider = githubProxyDispatcher
  ? GitHub({
      allowDangerousEmailAccountLinking: true,
      [customFetch]: githubProxyFetch,
    })
  : GitHub({ allowDangerousEmailAccountLinking: true })

// Lightweight config - no PrismaAdapter, safe to use in proxy (middleware)
export const authConfig: NextAuthConfig = {
  providers: [
    githubProvider,
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // Map token.sub to session.user.id for req.auth?.user?.id in proxy
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
}
