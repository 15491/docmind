"use client"

import { useState } from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth/auth-client"
import { toast } from "sonner"

export function useLoginFlow() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startPending] = useTransition()

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startPending(async () => {
      const { error } = await authClient.signIn.email({ email, password })

      if (error) {
        if (error.status === 429) {
          toast.error("登录尝试过于频繁，请稍后再试")
        } else {
          toast.error("邮箱或密码不正确")
        }
        return
      }

      router.refresh()
      router.push("/dashboard")
    })
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isPending,
    handlePasswordSubmit,
  }
}
