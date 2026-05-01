"use client"

import { useState, useEffect, useTransition } from "react"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

const LS_API = "docmind:api-config"
const LS_RAG = "docmind:rag-config"

export function useProfileForm() {
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [oldPwd, setOldPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [, startTransition] = useTransition()

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setNickname(data.user.name ?? "")
          setEmail(data.user.email ?? "")
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    const tasks: Promise<void>[] = []

    if (nickname.trim()) {
      tasks.push(
        fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nickname.trim() }),
        }).then(async (res) => {
          if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            throw new Error(d.error ?? "昵称保存失败")
          }
        })
      )
    }

    if (oldPwd && newPwd) {
      tasks.push(
        fetch("/api/user/password", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
        }).then(async (res) => {
          if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            throw new Error(d.error ?? "密码修改失败")
          }
          setOldPwd("")
          setNewPwd("")
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

  return { nickname, setNickname, email, oldPwd, setOldPwd, newPwd, setNewPwd, handleSave }
}

export function useApiForm() {
  const [glmKey, setGlmKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("https://open.bigmodel.cn/api/paas/v4")

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.zhipuApiKey) setGlmKey(data.user.zhipuApiKey)
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zhipuApiKey: glmKey }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error ?? "保存失败")
    }
    toast.success("API Key 已保存")
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
      const res = await fetch("/api/user/kbs", { method: "DELETE" })
      if (!res.ok) throw new Error("清空失败")
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
      const res = await fetch("/api/user", { method: "DELETE" })
      if (!res.ok) throw new Error("注销失败")
      toast.success("账户已注销")
      await signOut({ redirectTo: "/" })
    } catch {
      toast.error("注销失败，请稍后重试")
      setDeleting(false)
    }
  }

  return { confirm, setConfirm, clearing, deleting, handleClearKbs, handleDeleteAccount }
}
