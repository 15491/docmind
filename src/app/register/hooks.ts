"use client"

import { useState } from "react"
import type { RegisterForm } from "./types"

export function useRegisterForm() {
  const [form, setForm] = useState<RegisterForm>({ nickname: "", email: "", password: "" })

  const set = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: call register API
  }

  return { form, set, handleSubmit }
}
