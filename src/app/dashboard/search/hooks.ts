"use client"

import { useState } from "react"
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
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), topK: 15 }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '搜索失败')
      }

      const data = await response.json() as { success: boolean; results: SearchResult[] }
      setResults(data.results || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败，请稍后重试')
      setResults([])
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }

  return { query, setQuery, results, searched, loading, error, handleSearch }
}
