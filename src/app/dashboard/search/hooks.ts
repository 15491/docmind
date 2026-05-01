"use client"

import { useState } from "react"
import { http, ApiError } from "@/lib/request"
import type { SearchResult } from "./types"

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (q = query) => {
    if (!q.trim()) return
    setQuery(q)
    setLoading(true)
    setSearched(false)
    setError(null)

    try {
      const data = await http.post<{ results: SearchResult[] }>('/api/search', { query: q.trim(), topK: 15 })
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '搜索失败，请稍后重试')
      setResults([])
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }

  return { query, setQuery, results, searched, loading, error, handleSearch }
}
