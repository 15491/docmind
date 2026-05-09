"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import { THIRD_PARTY_PASSWORD_SIGNIN_MESSAGE } from "@/lib/auth-messages"

export function useLoginFlow() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startPending] = useTransition()

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startPending(async () => {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error === "rate_limited") {
        toast.error("登录尝试过于频繁，请稍后再试")
        return
      }

      if (result?.error === "oauth_only") {
        toast.error(THIRD_PARTY_PASSWORD_SIGNIN_MESSAGE)
        return
      }

      if (result?.error) {
        toast.error("邮箱或密码不正确")
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
