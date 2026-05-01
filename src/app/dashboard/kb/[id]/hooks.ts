"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDocs = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/status?kbId=${kbId}`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json() as { documents: Doc[]; nextCursor: string | null }
      setDocs(data.documents)
      setNextCursor(data.nextCursor ?? null)
      setError(null)
      return data.documents.some((d) => d.status === 'processing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
      return false
    }
  }, [kbId])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    try {
      setLoadingMore(true)
      const response = await fetch(`/api/documents/status?kbId=${kbId}&cursor=${nextCursor}`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json() as { documents: Doc[]; nextCursor: string | null }
      setDocs((prev) => [...prev, ...data.documents])
      setNextCursor(data.nextCursor ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more documents')
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

    const maxSize = 10 * 1024 * 1024

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
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errData = await response.json() as { message?: string }
            throw new Error(errData.message || 'Upload failed')
          }

          const data = await response.json() as { document: Doc }
          setDocs((prev) => [data.document, ...prev])
          startPolling() // 上传成功后确保轮询在运行
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err)
        }
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      setDeleting(true)
      setError(null)
      const response = await fetch(`/api/documents/${deleteDoc.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete document')
      setDocs((prev) => prev.filter((d) => d.id !== deleteDoc.id))
      if (previewDoc?.id === deleteDoc.id) setPreviewDoc(null)
      setDeleteDoc(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  return {
    docs, loading, loadingMore, hasMore: !!nextCursor, loadMore, error,
    dragging, setDragging,
    previewDoc, setPreviewDoc,
    deleteDoc, setDeleteDoc,
    handleDelete, fileInputRef, handleFileSelect,
    uploading, deleting,
  }
}
