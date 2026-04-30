"use client"

import { useEffect, useState } from "react"
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
        const response = await fetch('/api/kb')
        if (!response.ok) throw new Error('Failed to fetch knowledge bases')
        const data = await response.json() as { kbs: Kb[] }
        setKbs(data.kbs)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
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
      const response = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!response.ok) throw new Error('Failed to create knowledge base')
      const data = await response.json() as { kb: Kb }
      setKbs((prev) => [data.kb, ...prev])
      setName("")
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create knowledge base')
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
      const response = await fetch(`/api/kb/${deleteKb.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete knowledge base')
      setKbs((prev) => prev.filter((k) => k.id !== deleteKb.id))
      setDeleteKb(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge base')
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
        const response = await fetch(`/api/kb/${kbId}`)
        if (!response.ok) throw new Error('Failed to fetch knowledge base')
        const data = await response.json() as { kb: Kb }
        setKb(data.kb)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchKb()
  }, [kbId])

  return { kb, loading, error }
}
