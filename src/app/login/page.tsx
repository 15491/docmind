"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AuthLogo } from "@/components/auth/auth-logo"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { EyeIcon, ClearIcon, INPUT_CLS, LABEL_CLS, ICON_BTN_CLS } from "@/components/auth/form-ui"
import { useLoginFlow } from "./hooks"
import type { LoginStep } from "./types"

const OAUTH_ERRORS: Record<string, string> = {
  OAuthCallbackError: "OAuth 授权失败，请重试",
  OAuthSignin: "OAuth 登录失败，请重试",
}

const PROVIDER_NAME: Record<string, string> = {
  github: "GitHub",
  google: "Google",
}

function EmailChip({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between bg-[#f7f7f8] border border-[#ebebed] rounded-[8px] px-3 h-9 mb-4">
      <span className="text-[13px] text-[#35353d] truncate">{email}</span>
      <button
        type="button"
        onClick={onBack}
        className="ml-3 text-[12px] text-[#aaabb2] hover:text-zinc-700 transition-colors shrink-0"
      >
        更换
      </button>
    </div>
  )
}

function LoginForm() {
  const {
    step,
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    emailError,
    oauthProviders,
    isChecking,
    isPending,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleBack,
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

      {/* ── Step 1: Email ─────────────────────────────── */}
      {step === "email" && (
        <>
          <h1 className="text-[15px] font-bold text-[#0f0f10] mb-5 tracking-tight">登录你的账户</h1>

          <OAuthButtons mode="登录" />

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#f0f0f3]" />
            <span className="text-[11px] font-medium text-[#aaabb2]">或</span>
            <div className="flex-1 h-px bg-[#f0f0f3]" />
          </div>

          <form onSubmit={handleEmailSubmit}>
            <div className="mb-3">
              <label className={LABEL_CLS}>邮箱</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); }}
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
              {emailError && (
                <p className="mt-1.5 text-[12px] text-red-500">{emailError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isChecking}
              className="block w-full h-9 rounded-[8px] text-white text-[13px] font-semibold hover:bg-zinc-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            >
              {isChecking ? "检查中…" : "继续"}
            </button>
          </form>

          <p className="text-center text-[12.5px] text-[#aaabb2] mt-4">
            还没有账户？{" "}
            <Link href="/register" className="text-zinc-700 font-semibold hover:text-zinc-900 transition-colors">
              注册 →
            </Link>
          </p>
        </>
      )}

      {/* ── Step 2: Password ──────────────────────────── */}
      {step === "password" && (
        <>
          <h1 className="text-[15px] font-bold text-[#0f0f10] mb-5 tracking-tight">输入密码</h1>

          <EmailChip email={email} onBack={handleBack} />

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL_CLS} style={{ marginBottom: 0 }}>密码</label>
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="text-[12px] text-[#aaabb2] hover:text-zinc-700 transition-colors"
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
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
        </>
      )}

      {/* ── Step 3: OAuth ─────────────────────────────── */}
      {step === "oauth" && (
        <>
          <h1 className="text-[15px] font-bold text-[#0f0f10] mb-5 tracking-tight">选择登录方式</h1>

          <EmailChip email={email} onBack={handleBack} />

          <p className="text-[12.5px] text-[#62636b] mb-4">
            该账号通过{" "}
            <span className="font-semibold text-[#35353d]">
              {oauthProviders.map((p) => PROVIDER_NAME[p] ?? p).join(" / ")}
            </span>{" "}
            注册，请使用以下方式登录
          </p>

          <OAuthButtons mode="登录" providers={oauthProviders} />
        </>
      )}

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
