"use client"

import { useState, useTransition, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { http, ApiError } from "@/lib/request"
import type { RegisterForm } from "./types"

export function useRegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState<RegisterForm>({ nickname: "", email: "", password: "", code: "" })
  const [codeSent, setCodeSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isSending, startSending] = useTransition()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const set = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const clear = useCallback((field: keyof RegisterForm) => {
    setForm((prev) => ({ ...prev, [field]: "" }))
  }, [])

  const startCooldown = () => {
    setCooldown(60)
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const handleSendCode = () => {
    if (!form.email || cooldown > 0) return
    startSending(async () => {
      try {
        await http.post("/api/auth/send-code", { email: form.email, purpose: "register" })
        toast.success("验证码已发送，请查收邮件")
        setCodeSent(true)
        startCooldown()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "发送失败，请稍后重试")
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await http.post("/api/register", {
          name: form.nickname,
          email: form.email,
          password: form.password,
          code: form.code,
        })
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "注册失败，请稍后重试")
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
        router.refresh()
        router.push("/dashboard")
      }
    })
  }

  return { form, set, clear, showPassword, setShowPassword, handleSubmit, handleSendCode, isPending, isSending, codeSent, cooldown }
}
