"use client"

import { useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import type { RegisterForm } from "./types"

export function useRegisterForm() {
  const [form, setForm] = useState<RegisterForm>({ nickname: "", email: "", password: "", code: "" })
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [isSending, startSending] = useTransition()

  const set = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const startCooldown = () => {
    setCooldown(60)
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleSendCode = () => {
    if (!form.email || cooldown > 0) return
    startSending(async () => {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, purpose: "register" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? "发送失败，请稍后重试")
        return
      }
      toast.success("验证码已发送，请查收邮件")
      setCodeSent(true)
      startCooldown()
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.nickname,
          email: form.email,
          password: form.password,
          code: form.code,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "注册失败，请稍后重试")
        return
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.error) {
        toast.error("注册成功，但登录失败，请前往登录页")
      } else {
        window.location.href = "/dashboard"
      }
    })
  }

  return { form, set, handleSubmit, handleSendCode, isPending, isSending, codeSent, cooldown }
}
