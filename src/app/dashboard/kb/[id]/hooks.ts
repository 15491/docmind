"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { http, ApiError } from "@/lib/request"
import type { Doc } from "./types"

export function useDocList(kbId: string) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null)
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
      return data.documents.some((d) => d.status === 'processing')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '获取文档失败')
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
      setError(err instanceof ApiError ? err.message : '加载更多文档失败')
    } finally {
      setLoadingMore(false)
    }
  }, [kbId, nextCursor, loadingMore])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 幂等：已在轮询时调用无副作用
  const startPolling = useCallback(() => {
    if (intervalRef.current) return
    let pollCount = 0
    intervalRef.current = setInterval(async () => {
      pollCount++
      const stillProcessing = await fetchDocs()
      if (!stillProcessing || pollCount >= 30) stopPolling()
    }, 2000)
  }, [fetchDocs, stopPolling])

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    fetchDocs().then((hasProcessing) => {
      if (!isMounted) return
      setLoading(false)
      if (hasProcessing) startPolling()
    })

    return () => {
      isMounted = false
      stopPolling()
    }
  }, [kbId, fetchDocs, startPolling, stopPolling])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const maxSize = 50 * 1024 * 1024

    try {
      setUploading(true)
      setError(null)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (file.size > maxSize) {
          setError(`文件 ${file.name} 超过 10MB 限制，已跳过`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('kbId', kbId)

        try {
          const data = await http.upload<{ document: Doc }>('/api/upload', formData)
          setDocs((prev) => [data.document, ...prev])
          startPolling() // 上传成功后确保轮询在运行
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err)
        }
      }

      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onRetry = async (docId: string) => {
    try {
      setError(null)
      await http.post(`/api/documents/${docId}/retry`)
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'processing' } : d))
      stopPolling()
      startPolling()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '重试失败')
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      setDeleting(true)
      setError(null)
      await http.del(`/api/documents/${deleteDoc.id}`)
      setDocs((prev) => prev.filter((d) => d.id !== deleteDoc.id))
      if (previewDoc?.id === deleteDoc.id) setPreviewDoc(null)
      setDeleteDoc(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '删除文档失败')
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
    } else {
      setSelectedIds(new Set(docs.map((d) => d.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    try {
      setBatchDeleting(true)
      setError(null)
      await http.post('/api/documents/batch-delete', {
        ids: Array.from(selectedIds),
      })
      setDocs((prev) => prev.filter((d) => !selectedIds.has(d.id)))
      if (previewDoc && selectedIds.has(previewDoc.id)) setPreviewDoc(null)
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '批量删除失败')
    } finally {
      setBatchDeleting(false)
    }
  }

  return {
    docs, loading, loadingMore, hasMore: !!nextCursor, loadMore, error,
    dragging, setDragging,
    previewDoc, setPreviewDoc,
    deleteDoc, setDeleteDoc,
    handleDelete, onRetry, fileInputRef, handleFileSelect,
    uploading, deleting,
    selectedIds, toggleSelect, toggleSelectAll, handleBatchDelete, batchDeleting,
  }
}
