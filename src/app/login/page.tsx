"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AuthLogo } from "@/components/auth/auth-logo"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { EyeIcon, ClearIcon, INPUT_CLS, LABEL_CLS, ICON_BTN_CLS } from "@/components/auth/form-ui"
import { useLoginFlow } from "./hooks"

const OAUTH_ERRORS: Record<string, string> = {
  OAuthCallbackError: "OAuth 授权失败，请重试",
  OAuthSignin: "OAuth 登录失败，请重试",
}

function LoginForm() {
  const {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    isPending,
    handlePasswordSubmit,
  } = useLoginFlow()

  const searchParams = useSearchParams()
  const router = useRouter()
  const oauthError = searchParams.get("error")

  useEffect(() => {
    if (oauthError) {
      const msg = OAUTH_ERRORS[oauthError] ?? "登录失败，请重试"
      toast.error(msg)
      router.replace("/login")
    }
  }, [oauthError, router])

  return (
    <div className="bg-white border border-[#ebebed] rounded-[14px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <h1 className="text-[15px] font-bold text-[#0f0f10] mb-5 tracking-tight">登录你的账户</h1>

      <OAuthButtons mode="登录" />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#f0f0f3]" />
        <span className="text-[11px] font-medium text-[#aaabb2]">或</span>
        <div className="flex-1 h-px bg-[#f0f0f3]" />
      </div>

      <form onSubmit={handlePasswordSubmit}>
        <div className="mb-3">
          <label className={LABEL_CLS}>邮箱</label>
          <div className="relative">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLS}
              required
              autoFocus
            />
            {email && (
              <button
                type="button"
                onClick={() => setEmail("")}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${ICON_BTN_CLS}`}
                tabIndex={-1}
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={LABEL_CLS} style={{ marginBottom: 0 }}>密码</label>
            <Link
              href={email ? `/reset-password?email=${encodeURIComponent(email)}` : "/reset-password"}
              className="text-[12px] text-[#aaabb2] transition-colors hover:text-zinc-700"
            >
              忘记密码？
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLS}
              required
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {password && (
                <button
                  type="button"
                  onClick={() => setPassword("")}
                  className={ICON_BTN_CLS}
                  tabIndex={-1}
                >
                  <ClearIcon />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={ICON_BTN_CLS}
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="block w-full h-9 rounded-[8px] text-white text-[13px] font-semibold hover:bg-zinc-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          {isPending ? "登录中…" : "登录"}
        </button>
      </form>

      <p className="mt-3 text-[12px] leading-relaxed text-[#8a8b93]">
        如果你的账号最初是通过 GitHub 创建的，直接使用上方 GitHub 登录即可。登录后可在设置中补充邮箱密码。
      </p>

      <p className="text-center text-[12.5px] text-[#aaabb2] mt-4">
        还没有账户？{" "}
        <Link href="/register" className="text-zinc-700 font-semibold hover:text-zinc-900 transition-colors">
          注册 →
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <Suspense fallback={<div className="bg-white border border-[#ebebed] rounded-[14px] p-6 h-80" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
