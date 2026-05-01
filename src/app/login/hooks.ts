"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"
import type { LoginStep } from "./types"

export function useLoginFlow() {
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [oauthProviders, setOauthProviders] = useState<string[]>([])
  const [isChecking, startChecking] = useTransition()
  const [isPending, startPending] = useTransition()

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)
    startChecking(async () => {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.status === "not_found") {
        setEmailError("该邮箱未注册")
      } else if (data.status === "password") {
        setStep("password")
      } else if (data.status === "oauth") {
        setOauthProviders(data.providers as string[])
        setStep("oauth")
      }
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startPending(async () => {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) {
        toast.error("密码不正确")
      } else {
        router.refresh()
        router.push("/dashboard")
      }
    })
  }

  const handleBack = () => {
    setStep("email")
    setPassword("")
    setShowPassword(false)
    setEmailError(null)
  }

  return {
    step,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    emailError,
    oauthProviders,
    isChecking,
    isPending,
    handleEmailSubmit,
    handlePasswordSubmit,
    handleBack,
  }
}
