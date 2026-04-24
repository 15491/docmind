"use client"

import { useState, useRef } from "react"
import type { Doc } from "./types"
import { MOCK_DOCS } from "./constants"

export function useDocList() {
  const [docs, setDocs] = useState<Doc[]>(MOCK_DOCS)
  const [dragging, setDragging] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<Doc | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return
    // TODO: call API to upload files
  }

  const handleDelete = () => {
    if (!deleteDoc) return
    setDocs((prev) => prev.filter((d) => d.id !== deleteDoc.id))
    if (previewDoc?.id === deleteDoc.id) setPreviewDoc(null)
    setDeleteDoc(null)
  }

  return { docs, dragging, setDragging, previewDoc, setPreviewDoc, deleteDoc, setDeleteDoc, handleDelete, fileInputRef, handleFileSelect }
}
