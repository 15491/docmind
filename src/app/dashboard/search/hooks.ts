"use client"

import { useState } from "react"
import type { SearchResult } from "./types"
import { MOCK_RESULTS } from "./constants"

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSearch = (q = query) => {
    if (!q.trim()) return
    setQuery(q)
    setLoading(true)
    setSearched(false)
    setTimeout(() => {
      setResults(q.trim() ? MOCK_RESULTS : [])
      setSearched(true)
      setLoading(false)
    }, 600)
  }

  return { query, setQuery, results, searched, loading, handleSearch }
}
