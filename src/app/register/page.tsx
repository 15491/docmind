"use client"

import Link from "next/link"
import { AuthLogo } from "@/components/auth/auth-logo"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { EyeIcon, ClearIcon, INPUT_CLS, LABEL_CLS, ICON_BTN_CLS } from "@/components/auth/form-ui"
import { useRegisterForm } from "./hooks"

export default function RegisterPage() {
  const { form, set, clear, showPassword, setShowPassword, handleSubmit, handleSendCode, isPending, isSending, codeSent, cooldown } = useRegisterForm()

  return (
    <div className="bg-muted/40 flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />

        <div className="border-border bg-card rounded-[14px] border p-6 shadow-sm">
          <h1 className="text-foreground mb-5 text-[15px] font-bold tracking-tight">创建你的账户</h1>

          <OAuthButtons mode="注册" />

          <div className="mb-5 flex items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[11px] font-medium">或</span>
            <div className="bg-border h-px flex-1" />
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className={LABEL_CLS}>昵称</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="你的名字"
                  value={form.nickname}
                  onChange={set("nickname")}
                  className={INPUT_CLS}
                  required
                />
                {form.nickname && (
                  <button type="button" onClick={() => clear("nickname")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${ICON_BTN_CLS}`} tabIndex={-1}>
                    <ClearIcon />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>邮箱</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSending || cooldown > 0 || !form.email}
                  className="border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground h-9 flex-shrink-0 rounded-[8px] border px-3 text-[12.5px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? "发送中…" : cooldown > 0 ? `${cooldown}s` : codeSent ? "重新发送" : "发送验证码"}
                </button>
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>验证码</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="请输入 6 位验证码"
                  value={form.code}
                  onChange={set("code")}
                  className={INPUT_CLS}
                  maxLength={6}
                  required
                />
                {form.code && (
                  <button type="button" onClick={() => clear("code")} className={`absolute right-2 top-1/2 -translate-y-1/2 ${ICON_BTN_CLS}`} tabIndex={-1}>
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
                  placeholder="至少 8 位"
                  value={form.password}
                  onChange={set("password")}
                  className={INPUT_CLS}
                  required
                  minLength={8}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 block h-9 w-full rounded-[8px] text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "注册中…" : "创建账户"}
            </button>
          </form>

          <p className="text-muted-foreground mt-4 text-center text-[12.5px]">
            已有账户？{" "}
            <Link href="/login" className="text-foreground hover:text-foreground/70 font-semibold transition-colors">
              登录 →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
