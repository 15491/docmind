"use client"

import { useState } from "react"
import { MOCK_KBS } from "./constants"
import type { Kb } from "./types"

export function useKbList() {
  const [kbs, setKbs] = useState<Kb[]>(MOCK_KBS)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [deleteKb, setDeleteKb] = useState<Kb | null>(null)

  const handleCreate = () => {
    if (name.trim().length < 2) return
    setKbs((prev) => [
      ...prev,
      { id: Date.now().toString(), name: name.trim(), docCount: 0, updatedAt: "刚刚" },
    ])
    setName("")
    setOpen(false)
  }

  const handleDelete = (kb: Kb) => setDeleteKb(kb)

  const confirmDelete = () => {
    if (!deleteKb) return
    setKbs((prev) => prev.filter((k) => k.id !== deleteKb.id))
    setDeleteKb(null)
  }

  return { kbs, open, setOpen, name, setName, handleCreate, handleDelete, deleteKb, setDeleteKb, confirmDelete }
}
