"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AuthLogo } from "@/components/auth/auth-logo"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { useLoginForm } from "./hooks"

const INPUT_CLS = "w-full h-9 bg-white border-[1.5px] border-[#e2e2e8] rounded-[8px] px-3 text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] outline-none focus:border-zinc-700 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.07)] transition-all font-sans"
const LABEL_CLS = "block text-[11.5px] font-semibold text-[#62636b] mb-1.5 uppercase tracking-wide"

const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "该邮箱已通过其他方式注册，请使用原始登录方式",
  OAuthCallbackError: "OAuth 授权失败，请重试",
  OAuthSignin: "OAuth 登录失败，请重试",
  CredentialsSignin: "邮箱或密码不正确",
}

function LoginForm() {
  const { form, set, handleSubmit, error, isPending } = useLoginForm()
  const searchParams = useSearchParams()
  const oauthError = searchParams.get("error")
  const displayError = error || (oauthError ? (OAUTH_ERRORS[oauthError] ?? "登录失败，请重试") : "")

  return (
    <div className="bg-white border border-[#ebebed] rounded-[14px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <h1 className="text-[15px] font-bold text-[#0f0f10] mb-5 tracking-tight">登录你的账户</h1>

      <OAuthButtons mode="登录" />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#f0f0f3]" />
        <span className="text-[11px] font-medium text-[#aaabb2]">或</span>
        <div className="flex-1 h-px bg-[#f0f0f3]" />
      </div>

      {displayError && (
        <p className="text-[12.5px] text-red-500 bg-red-50 border border-red-100 rounded-[8px] px-3 py-2 mb-4">
          {displayError}
        </p>
      )}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className={LABEL_CLS}>邮箱</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            className={INPUT_CLS}
            required
          />
        </div>
        <div>
          <label className={LABEL_CLS}>密码</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={set("password")}
            className={INPUT_CLS}
            required
          />
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
