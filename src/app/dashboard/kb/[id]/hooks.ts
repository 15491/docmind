"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ApiError, http } from "@/lib/request"
import type { Doc } from "./types"

export function useDocList(kbId: string) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleting, setBatchDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const data = await http.get<{ documents: Doc[]; nextCursor: string | null }>(
        `/api/documents/status?kbId=${kbId}`
      )
      setDocs(data.documents)
      setNextCursor(data.nextCursor ?? null)
      setError(null)
      return data.documents.some((doc) => doc.status === "processing")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "获取文档失败")
      return false
    }
  }, [kbId])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return

    try {
      setLoadingMore(true)
      const data = await http.get<{ documents: Doc[]; nextCursor: string | null }>(
        `/api/documents/status?kbId=${kbId}&cursor=${nextCursor}`
      )
      setDocs((prev) => [...prev, ...data.documents])
      setNextCursor(data.nextCursor ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "加载更多文档失败")
    } finally {
      setLoadingMore(false)
    }
  }, [kbId, loadingMore, nextCursor])

  const stopPolling = useCallback(() => {
    if (!intervalRef.current) return
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  const startPolling = useCallback(() => {
    if (intervalRef.current) return

    let pollCount = 0
    intervalRef.current = setInterval(async () => {
      pollCount += 1
      const stillProcessing = await fetchDocs()
      if (!stillProcessing || pollCount >= 30) {
        stopPolling()
      }
    }, 2000)
  }, [fetchDocs, stopPolling])

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetchDocs().then((hasProcessing) => {
      if (!isMounted) return
      setLoading(false)
      if (hasProcessing) {
        startPolling()
      }
    })

    return () => {
      isMounted = false
      stopPolling()
    }
  }, [fetchDocs, kbId, startPolling, stopPolling])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const maxSize = 50 * 1024 * 1024

    try {
      setUploading(true)

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]

        if (file.size > maxSize) {
          toast.error(`${file.name} 超过 50MB 限制，已跳过`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("kbId", kbId)

        try {
          const data = await http.upload<{ document: Doc }>("/api/upload", formData)
          setDocs((prev) => [data.document, ...prev])
          startPolling()
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : `${file.name} 上传失败`)
        }
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "上传失败")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const onRetry = async (docId: string) => {
    try {
      await http.post(`/api/documents/${docId}/retry`)
      setDocs((prev) => prev.map((doc) => doc.id === docId ? { ...doc, status: "processing" } : doc))
      stopPolling()
      startPolling()
      toast.success("已重新提交处理")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "重试失败")
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return

    try {
      setDeleting(true)
      await http.del(`/api/documents/${deleteDoc.id}`)
      setDocs((prev) => prev.filter((doc) => doc.id !== deleteDoc.id))
      setDeleteDoc(null)
      toast.success("文档已删除")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "删除文档失败")
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelect = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) {
        next.delete(docId)
      } else {
        next.add(docId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set())
      return
    }

    setSelectedIds(new Set(docs.map((doc) => doc.id)))
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size

    try {
      setBatchDeleting(true)
      await http.post("/api/documents/batch-delete", {
        ids: Array.from(selectedIds),
      })
      setDocs((prev) => prev.filter((doc) => !selectedIds.has(doc.id)))
      setSelectedIds(new Set())
      toast.success(`已删除 ${count} 个文档`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "批量删除失败")
    } finally {
      setBatchDeleting(false)
    }
  }

  return {
    docs,
    loading,
    loadingMore,
    hasMore: !!nextCursor,
    loadMore,
    error,
    dragging,
    setDragging,
    deleteDoc,
    setDeleteDoc,
    handleDelete,
    onRetry,
    fileInputRef,
    handleFileSelect,
    uploading,
    deleting,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    handleBatchDelete,
    batchDeleting,
  }
}
