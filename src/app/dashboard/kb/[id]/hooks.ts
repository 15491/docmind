"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import type { Doc } from "./types"

export function useDocList(kbId: string) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 获取文档列表和状态
  const fetchDocs = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/status?kbId=${kbId}`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json() as { documents: Doc[] }
      setDocs(data.documents)
      setError(null)

      // 如果有 processing 文档，继续轮询
      const hasProcessing = data.documents.some((d) => d.status === 'processing')
      return hasProcessing
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
      return false
    }
  }, [kbId])

  // 初始化加载和轮询
  useEffect(() => {
    let isMounted = true
    let interval: NodeJS.Timeout | null = null

    const initializeFetch = async () => {
      setLoading(true)
      const hasProcessing = await fetchDocs()
      setLoading(false)

      if (hasProcessing && isMounted) {
        // 启动轮询
        interval = setInterval(async () => {
          const stillProcessing = await fetchDocs()
          if (!stillProcessing) {
            if (interval) clearInterval(interval)
            interval = null
          }
        }, 2000)
      }
    }

    initializeFetch()

    return () => {
      isMounted = false
      if (interval) clearInterval(interval)
    }
  }, [kbId, fetchDocs])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const maxSize = 10 * 1024 * 1024 // 10MB

    try {
      setUploading(true)
      setError(null)

      // 处理所有选中的文件
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
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err)
        }
      }

      // 轮询会自动在 useEffect 中处理
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
      const response = await fetch(`/api/documents/${deleteDoc.id}`, {
        method: 'DELETE',
      })
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
    docs,
    loading,
    error,
    dragging,
    setDragging,
    previewDoc,
    setPreviewDoc,
    deleteDoc,
    setDeleteDoc,
    handleDelete,
    fileInputRef,
    handleFileSelect,
    uploading,
    deleting,
  }
}
