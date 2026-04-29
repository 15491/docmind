"use client"

import { useState, useTransition } from "react"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import type { LoginForm } from "./types"

export function useLoginForm() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" })
  const [isPending, startTransition] = useTransition()

  const set = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

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
        window.location.href = "/dashboard"
      }
    })
  }

  return { form, set, handleSubmit, isPending }
}
