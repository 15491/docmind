"use client"

import { useState } from "react"
import type { LoginForm } from "./types"

export function useLoginForm() {
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" })

  const set = (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: call login API
  }

  return { form, set, handleSubmit }
}
