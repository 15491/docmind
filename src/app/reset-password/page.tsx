"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AuthLogo } from "@/components/auth/auth-logo"
import { EyeIcon, INPUT_CLS, LABEL_CLS, ICON_BTN_CLS } from "@/components/auth/form-ui"
import { useResetPassword } from "./hooks"

function ResetForm() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get("email") ?? ""
  const { form, set, codeSent, cooldown, showPassword, setShowPassword, handleSendCode, handleSubmit, isPending, isSending } =
    useResetPassword(initialEmail)

  return (
    <div className="bg-white border border-[#ebebed] rounded-[14px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <h1 className="text-[15px] font-bold text-[#0f0f10] mb-1.5 tracking-tight">重置密码</h1>
      <p className="text-[12.5px] text-[#aaabb2] mb-5">验证邮箱后设置新密码</p>

      <form className="space-y-3" onSubmit={handleSubmit}>
        {/* 邮箱 + 发送验证码 */}
        <div>
          <label className={LABEL_CLS}>邮箱</label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set("email")}
              className={INPUT_CLS}
              required
              autoFocus={!initialEmail}
            />
            <button
              type="button"
              disabled={!form.email || cooldown > 0 || isSending}
              onClick={handleSendCode}
              className="shrink-0 h-9 px-3 rounded-[8px] border-[1.5px] border-[#e2e2e8] text-[12.5px] font-medium text-[#35353d] hover:border-zinc-400 hover:bg-zinc-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {cooldown > 0 ? `${cooldown}s` : isSending ? "发送中…" : codeSent ? "重新发送" : "获取验证码"}
            </button>
          </div>
        </div>

        {/* 验证码 */}
        <div>
          <label className={LABEL_CLS}>验证码</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6 位数字"
            maxLength={6}
            value={form.code}
            onChange={set("code")}
            className={INPUT_CLS}
            required
          />
        </div>

        {/* 新密码 */}
        <div>
          <label className={LABEL_CLS}>新密码</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="至少 8 位"
              value={form.password}
              onChange={set("password")}
              className={INPUT_CLS}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 ${ICON_BTN_CLS}`}
              tabIndex={-1}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !codeSent}
          className="block w-full h-9 rounded-[8px] text-white text-[13px] font-semibold hover:bg-zinc-700 transition-all mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
        >
          {isPending ? "提交中…" : "重置密码"}
        </button>
      </form>

      <p className="text-center text-[12.5px] text-[#aaabb2] mt-4">
        想起来了？{" "}
        <Link href="/login" className="text-zinc-700 font-semibold hover:text-zinc-900 transition-colors">
          返回登录 →
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <Suspense fallback={<div className="bg-white border border-[#ebebed] rounded-[14px] p-6 h-72" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
