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
    <div className="border-border bg-card rounded-[14px] border p-6 shadow-sm">
      <h1 className="text-foreground mb-1.5 text-[15px] font-bold tracking-tight">重置密码</h1>
      <p className="text-muted-foreground mb-5 text-[12.5px]">验证邮箱后设置新密码</p>

      <form className="space-y-3" onSubmit={handleSubmit}>
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
              className="border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground h-9 shrink-0 rounded-[8px] border px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cooldown > 0 ? `${cooldown}s` : isSending ? "发送中…" : codeSent ? "重新发送" : "获取验证码"}
            </button>
          </div>
        </div>

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
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 block h-9 w-full rounded-[8px] text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "提交中…" : "重置密码"}
        </button>
      </form>

      <p className="text-muted-foreground mt-4 text-center text-[12.5px]">
        想起来了？{" "}
        <Link href="/login" className="text-foreground hover:text-foreground/70 font-semibold transition-colors">
          返回登录 →
        </Link>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />
        <Suspense fallback={<div className="border-border bg-card h-72 rounded-[14px] border p-6" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
