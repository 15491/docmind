"use client"

import Link from "next/link"
import { AuthLogo } from "@/components/auth/auth-logo"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { EyeIcon, ClearIcon, INPUT_CLS, LABEL_CLS, ICON_BTN_CLS } from "@/components/auth/form-ui"
import { useRegisterForm } from "./hooks"

export default function RegisterPage() {
  const { form, set, clear, showPassword, setShowPassword, handleSubmit, handleSendCode, isPending, isSending, codeSent, cooldown } = useRegisterForm()

  return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <AuthLogo />

        <div className="bg-white border border-[#ebebed] rounded-[14px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <h1 className="text-[15px] font-bold text-[#0f0f10] mb-5 tracking-tight">创建你的账户</h1>

          <OAuthButtons mode="注册" />

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#f0f0f3]" />
            <span className="text-[11px] font-medium text-[#aaabb2]">或</span>
            <div className="flex-1 h-px bg-[#f0f0f3]" />
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
                  className="flex-shrink-0 h-9 px-3 rounded-[8px] text-[12.5px] font-semibold border border-[#e2e2e8] text-[#55555e] hover:border-zinc-400 hover:text-zinc-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
              {isPending ? "注册中…" : "创建账户"}
            </button>
          </form>

          <p className="text-center text-[12.5px] text-[#aaabb2] mt-4">
            已有账户？{" "}
            <Link href="/login" className="text-zinc-700 font-semibold hover:text-zinc-900 transition-colors">
              登录 →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

