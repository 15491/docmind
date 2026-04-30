"use client"

import { useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import type { LoginForm } from "./types"

export function useLoginForm() {
  const router = useRouter()
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()

  const set = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const clear = useCallback((field: keyof LoginForm) => {
    setForm((prev) => ({ ...prev, [field]: "" }))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (result?.error) {
        toast.error("邮箱或密码不正确")
      } else {
        router.refresh()
        router.push("/dashboard")
      }
    })
  }

  return { form, set, clear, showPassword, setShowPassword, handleSubmit, isPending }
}
