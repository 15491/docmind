"use client"

import { useEffect, useState } from "react"
import { ApiError, http } from "@/lib/request"
import type { Kb } from "./types"

export function useKbList() {
  const [kbs, setKbs] = useState<Kb[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [deleteKb, setDeleteKb] = useState<Kb | null>(null)
  const [editKb, setEditKb] = useState<Kb | null>(null)
  const [editName, setEditName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchKbs = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await http.get<{ kbs: Kb[] }>("/api/kb")
        setKbs(data.kbs)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "获取知识库失败")
      } finally {
        setLoading(false)
      }
    }

    void fetchKbs()
  }, [])

  const handleCreate = async () => {
    if (name.trim().length < 2) return

    try {
      setCreating(true)
      setError(null)
      const data = await http.post<{ kb: Kb }>("/api/kb", { name: name.trim() })
      setKbs((prev) => [data.kb, ...prev])
      setName("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "创建知识库失败")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (kb: Kb) => {
    setDeleteKb(kb)
  }

  const confirmDelete = async () => {
    if (!deleteKb) return

    try {
      setDeleting(true)
      setError(null)
      await http.del(`/api/kb/${deleteKb.id}`)
      setKbs((prev) => prev.filter((kb) => kb.id !== deleteKb.id))
      setDeleteKb(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "删除知识库失败")
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (kb: Kb) => {
    setEditKb(kb)
    setEditName(kb.name)
  }

  const confirmEdit = async () => {
    if (!editKb || editName.trim().length < 2) return

    try {
      setUpdating(true)
      setError(null)
      const data = await http.patch<{ kb: Kb }>(`/api/kb/${editKb.id}`, {
        name: editName.trim(),
      })

      setKbs((prev) => prev.map((kb) => (
        kb.id === editKb.id ? data.kb : kb
      )))
      setEditKb(null)
      setEditName("")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "更新知识库失败")
    } finally {
      setUpdating(false)
    }
  }

  const cancelEdit = () => {
    setEditKb(null)
    setEditName("")
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
    editKb,
    editName,
    setEditName,
    handleEdit,
    confirmEdit,
    cancelEdit,
    creating,
    deleting,
    updating,
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
        setError(err instanceof ApiError ? err.message : "获取知识库失败")
      } finally {
        setLoading(false)
      }
    }

    void fetchKb()
  }, [kbId])

  return { kb, loading, error }
}
