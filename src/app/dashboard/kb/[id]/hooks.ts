"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ApiError, http } from "@/lib/http/request"
import type { Kb } from "@/app/dashboard/types"
import type { Doc } from "./types"

const DOCS_FIRST_PAGE_SIZE = 20

function mergeLatestPageIntoLoadedDocs(latestDocs: Doc[], currentDocs: Doc[]) {
  const latestIds = new Set(latestDocs.map((doc) => doc.id))
  return [...latestDocs, ...currentDocs.filter((doc) => !latestIds.has(doc.id))]
}

export function useKbInfo(kbId: string) {
  const [kb, setKb] = useState<Kb | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKb = useCallback(async () => {
    try {
      const data = await http.get<{ kb: Kb }>(`/api/kb/${kbId}`)
      setKb(data.kb)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "获取知识库失败")
    } finally {
      setLoading(false)
    }
  }, [kbId])

  useEffect(() => {
    // eslint-disable-next-line
    void fetchKb()
  }, [fetchKb])

  return { kb, loading, error, refresh: fetchKb }
}

export function useDocList(kbId: string, onCountChange?: () => void) {
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
  const hasLoadedMoreRef = useRef(false)

  const fetchDocs = useCallback(async (mode: "replace" | "merge" = "replace") => {
    try {
      const data = await http.get<{ documents: Doc[]; nextCursor: string | null }>(
        `/api/documents/status?kbId=${kbId}&limit=${DOCS_FIRST_PAGE_SIZE}`
      )
      const latestDocs = data.documents ?? []
      const shouldMerge = mode === "merge" && hasLoadedMoreRef.current

      setDocs((prev) => shouldMerge ? mergeLatestPageIntoLoadedDocs(latestDocs, prev) : latestDocs)

      if (!shouldMerge) {
        hasLoadedMoreRef.current = false
        setNextCursor(data.nextCursor ?? null)
      }

      setError(null)
      return latestDocs.some((doc) => doc.status === "processing")
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
        `/api/documents/status?kbId=${kbId}&cursor=${nextCursor}&limit=${DOCS_FIRST_PAGE_SIZE}`
      )
      const appendedDocs = data.documents ?? []
      setDocs((prev) => {
        if (prev.length >= DOCS_FIRST_PAGE_SIZE && appendedDocs.length > 0) {
          hasLoadedMoreRef.current = true
        }
        return [...prev, ...appendedDocs]
      })
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
      const stillProcessing = await fetchDocs("merge")
      if (!stillProcessing || pollCount >= 30) {
        stopPolling()
      }
    }, 2000)
  }, [fetchDocs, stopPolling])

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      setLoading(true)
      const hasProcessing = await fetchDocs()
      if (!isMounted) return
      setLoading(false)
      if (hasProcessing) startPolling()
    }

    void run()

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
          onCountChange?.()
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
      onCountChange?.()
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
      onCountChange?.()
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
