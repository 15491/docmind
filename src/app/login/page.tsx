"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { AuthLogo } from "@/components/auth/auth-logo"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { EyeIcon, ClearIcon, INPUT_CLS, LABEL_CLS, ICON_BTN_CLS } from "@/components/auth/form-ui"
import { useLoginForm } from "./hooks"

const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "该邮箱已通过其他方式注册，请使用原始登录方式",
  OAuthCallbackError: "OAuth 授权失败，请重试",
  OAuthSignin: "OAuth 登录失败，请重试",
  CredentialsSignin: "邮箱或密码不正确",
}

function LoginForm() {
  const { form, set, clear, showPassword, setShowPassword, handleSubmit, isPending } = useLoginForm()
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

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className={LABEL_CLS}>邮箱</label>
          <div className="relative">
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              className={INPUT_CLS}
              required
            />
            {form.email && (
              <button type="button" onClick={() => clear("email")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${ICON_BTN_CLS}`} tabIndex={-1}>
                <ClearIcon />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>密码</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
              className={INPUT_CLS}
              required
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {form.password && (
                <button type="button" onClick={() => clear("password")} className={ICON_BTN_CLS} tabIndex={-1}>
                  <ClearIcon />
                </button>
              )}
              <button type="button" onClick={() => setShowPassword((v) => !v)} className={ICON_BTN_CLS} tabIndex={-1}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="block w-full h-9 rounded-[8px] text-white text-[13px] font-semibold hover:bg-zinc-700 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          {isPending ? "登录中…" : "登录"}
        </button>
      </form>

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


