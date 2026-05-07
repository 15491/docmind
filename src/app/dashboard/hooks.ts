"use client"

import { useCallback, useEffect, useState } from "react"
import { ApiError, http } from "@/lib/request"
import type { Kb } from "./types"

const PAGE_SIZE = 12

type KbListResponse = {
  kbs: Kb[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function useKbList() {
  const [kbs, setKbs] = useState<Kb[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [deleteKb, setDeleteKb] = useState<Kb | null>(null)
  const [editKb, setEditKb] = useState<Kb | null>(null)
  const [editName, setEditName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)

  const hasMore = currentPage < totalPages

  const fetchPage = useCallback(async (page: number) => {
    return http.get<KbListResponse>(`/api/kb?page=${page}&pageSize=${PAGE_SIZE}`)
  }, [])

  const refreshList = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await fetchPage(1)
      setKbs(data.kbs)
      setTotal(data.total)
      setCurrentPage(data.page)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "获取知识库失败")
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      setError(null)

      const nextPage = currentPage + 1
      const data = await fetchPage(nextPage)

      setKbs((prev) => {
        const seen = new Set(prev.map((kb) => kb.id))
        const appended = data.kbs.filter((kb) => !seen.has(kb.id))
        return [...prev, ...appended]
      })
      setTotal(data.total)
      setCurrentPage(data.page)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "加载更多知识库失败")
    } finally {
      setLoadingMore(false)
    }
  }, [currentPage, fetchPage, hasMore, loading, loadingMore])

  const handleCreate = async () => {
    if (name.trim().length < 2) return

    try {
      setCreating(true)
      setError(null)
      await http.post<{ kb: Kb }>("/api/kb", { name: name.trim() })
      setName("")
      setOpen(false)
      await refreshList()
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
      setDeleteKb(null)
      await refreshList()
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
    total,
    loading,
    loadingMore,
    hasMore,
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
    loadMore,
    refreshList,
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
