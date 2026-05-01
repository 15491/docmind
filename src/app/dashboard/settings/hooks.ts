"use client"

import { useState, useEffect, useRef } from "react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { http, ApiError } from "@/lib/request"

const LS_RAG = "docmind:rag-config"

export function useProfileForm() {
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")

  useEffect(() => {
    http.get<{ user: { name?: string; email?: string } }>("/api/user")
      .then((data) => {
        setNickname(data.user.name ?? "")
        setEmail(data.user.email ?? "")
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    const tasks: Promise<void>[] = []

    if (nickname.trim()) {
      tasks.push(
        http.patch("/api/user", { name: nickname.trim() })
          .then(() => {})
          .catch((err) => {
            throw new Error(err instanceof ApiError ? err.message : "昵称保存失败")
          })
      )
    }

    if (oldPwd && newPwd) {
      tasks.push(
        http.patch("/api/user/password", { oldPassword: oldPwd, newPassword: newPwd })
          .then(() => {
            setOldPwd("")
            setNewPwd("")
          })
          .catch((err) => {
            throw new Error(err instanceof ApiError ? err.message : "密码修改失败")
          })
      )
    }

    const results = await Promise.allSettled(tasks)
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected")
    if (failed.length > 0) {
      toast.error(failed[0].reason?.message ?? "保存失败")
      throw failed[0].reason
    }
    toast.success("保存成功")
  }

  return { nickname, setNickname, email, setEmail, oldPwd, setOldPwd, newPwd, setNewPwd, handleSave }
}

export function useEmailChange() {
  const [newEmail, setNewEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"idle" | "codeSent" | "done">("idle")
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const sendCode = async () => {
    setError("")
    setSending(true)
    try {
      await http.post("/api/auth/send-code", { email: newEmail, purpose: "change-email" })
      setStep("codeSent")
      startCountdown()
      toast.success("验证码已发送")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "发送失败")
    } finally {
      setSending(false)
    }
  }

  const confirmChange = async () => {
    setError("")
    setSaving(true)
    try {
      await http.patch("/api/user/email", { email: newEmail, code })
      setStep("done")
      toast.success("邮箱已更新，请重新登录")
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "修改失败")
    } finally {
      setSaving(false)
    }
  }

  return { newEmail, setNewEmail, code, setCode, step, sending, saving, error, countdown, sendCode, confirmChange }
}

export function useApiForm() {
  const [glmKey, setGlmKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://open.bigmodel.cn/api/paas/v4")

  useEffect(() => {
    http.get<{ user: { zhipuApiKey?: string } }>("/api/user")
      .then((data) => {
        if (data.user?.zhipuApiKey) setGlmKey(data.user.zhipuApiKey)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await http.patch("/api/user", { zhipuApiKey: glmKey })
      toast.success("API Key 已保存")
    } catch (err) {
      throw new Error(err instanceof ApiError ? err.message : "保存失败")
    }
  }

  return { glmKey, setGlmKey, baseUrl, setBaseUrl, handleSave }
}

export function useRagConfig() {
  const [chunkSize, setChunkSize] = useState(500)
  const [overlap, setOverlap] = useState(50)
  const [topK, setTopK] = useState(5)
  const [temperature, setTemperature] = useState(0.3)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_RAG) ?? "{}")
      if (saved.chunkSize) setChunkSize(saved.chunkSize)
      if (saved.overlap !== undefined) setOverlap(saved.overlap)
      if (saved.topK) setTopK(saved.topK)
      if (saved.temperature !== undefined) setTemperature(saved.temperature)
    } catch {}
  }, [])

  const handleSave = async () => {
    localStorage.setItem(LS_RAG, JSON.stringify({ chunkSize, overlap, topK, temperature }))
    toast.success("检索参数已保存")
  }

  return { chunkSize, setChunkSize, overlap, setOverlap, topK, setTopK, temperature, setTemperature, handleSave }
}

export function useDangerZone() {
  const [confirm, setConfirm] = useState("")
  const [clearing, setClearing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleClearKbs = async () => {
    setClearing(true)
    try {
      await http.del("/api/user/kbs")
      toast.success("所有知识库已清空")
    } catch {
      toast.error("清空失败，请稍后重试")
    } finally {
      setClearing(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm !== "DELETE") return
    setDeleting(true)
    try {
      await http.del("/api/user")
      toast.success("账户已注销")
      await signOut({ redirectTo: "/" })
    } catch {
      toast.error("注销失败，请稍后重试")
      setDeleting(false)
    }
  }

  return { confirm, setConfirm, clearing, deleting, handleClearKbs, handleDeleteAccount }
}
