"use client"

import { useEffect, useState } from "react"
import { http, ApiError } from "@/lib/request"
import type { Kb } from "./types"

export function useKbList() {
  const [kbs, setKbs] = useState<Kb[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [deleteKb, setDeleteKb] = useState<Kb | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 获取知识库列表
  useEffect(() => {
    const fetchKbs = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await http.get<{ kbs: Kb[] }>('/api/kb')
        setKbs(data.kbs)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '获取知识库失败')
      } finally {
        setLoading(false)
      }
    }
    fetchKbs()
  }, [])

  const handleCreate = async () => {
    if (name.trim().length < 2) return
    try {
      setCreating(true)
      setError(null)
      const data = await http.post<{ kb: Kb }>('/api/kb', { name: name.trim() })
      setKbs((prev) => [data.kb, ...prev])
      setName("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '创建知识库失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (kb: Kb) => setDeleteKb(kb)

  const confirmDelete = async () => {
    if (!deleteKb) return
    try {
      setDeleting(true)
      setError(null)
      await http.del(`/api/kb/${deleteKb.id}`)
      setKbs((prev) => prev.filter((k) => k.id !== deleteKb.id))
      setDeleteKb(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除知识库失败')
    } finally {
      setDeleting(false)
    }
  }

  return {
    kbs,
    loading,
    error,
    open,
    setOpen,
    name,
    setName,
    handleCreate,
    handleDelete,
    deleteKb,
    setDeleteKb,
    confirmDelete,
    creating,
    deleting,
  }
}

export function useKbInfo(kbId: string) {
  const [kb, setKb] = useState<Kb | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKb = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await http.get<{ kb: Kb }>(`/api/kb/${kbId}`)
        setKb(data.kb)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : '获取知识库失败')
      } finally {
        setLoading(false)
      }
    }
    fetchKb()
  }, [kbId])

  return { kb, loading, error }
}
