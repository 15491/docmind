"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { ResetForm } from "./types"

export function useResetPassword(initialEmail = "") {
  const router = useRouter()
  const [form, setForm] = useState<ResetForm>({ email: initialEmail, code: "", password: "" })
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isSending, startSending] = useTransition()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const set = (field: keyof ResetForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const startCooldown = () => {
    setCooldown(60)
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0 }
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
        body: JSON.stringify({ email: form.email, purpose: "reset-password" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? "发送失败，请稍后重试"); return }
      toast.success("验证码已发送，请查收邮件")
      setCodeSent(true)
      startCooldown()
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: form.code, newPassword: form.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error ?? "重置失败，请稍后重试"); return }
      toast.success("密码已重置，请登录")
      router.push("/login")
    })
  }

  return { form, set, codeSent, cooldown, showPassword, setShowPassword, handleSendCode, handleSubmit, isPending, isSending }
}
