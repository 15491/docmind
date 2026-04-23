"use client"

import { useState } from "react"
import { MOCK_KBS } from "./constants"
import type { Kb } from "./types"

export function useKbList() {
  const [kbs, setKbs] = useState<Kb[]>(MOCK_KBS)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const handleCreate = () => {
    if (name.trim().length < 2) return
    setKbs((prev) => [
      ...prev,
      { id: Date.now().toString(), name: name.trim(), docCount: 0, updatedAt: "刚刚" },
    ])
    setName("")
    setOpen(false)
  }

  const handleDelete = (id: string) => {
    setKbs((prev) => prev.filter((k) => k.id !== id))
  }

  return { kbs, open, setOpen, name, setName, handleCreate, handleDelete }
}
