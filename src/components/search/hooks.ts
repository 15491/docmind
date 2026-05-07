"use client"

import { useCallback, useEffect, useState } from "react"
import { http, ApiError } from "@/lib/request"
import type { SearchResult } from "./types"
import { RECENT_SEARCHES } from "./constants"

const SEARCH_HISTORY_KEY = "docmind:search-history"
const MAX_RECENT_SEARCHES = 6

function dedupeRecentSearches(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, MAX_RECENT_SEARCHES)
}

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>(RECENT_SEARCHES)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored) as string[]
      setRecentSearches(dedupeRecentSearches([...parsed, ...RECENT_SEARCHES]))
    } catch {
      setRecentSearches(RECENT_SEARCHES)
    }
  }, [])

  const rememberSearch = useCallback((keyword: string) => {
    const nextRecentSearches = dedupeRecentSearches([keyword, ...recentSearches])
    setRecentSearches(nextRecentSearches)

    try {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextRecentSearches))
    } catch {
      // 忽略存储失败，保持搜索流程可用
    }
  }, [recentSearches])

  const handleSearch = useCallback(async (nextQuery = query) => {
    const keyword = nextQuery.trim()
    if (!keyword) return

    setQuery(keyword)
    setLoading(true)
    setSearched(false)
    setError(null)
    rememberSearch(keyword)

    try {
      const data = await http.post<{ results: SearchResult[] }>("/api/search", { query: keyword, topK: 12 })
      setResults(data.results ?? [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "搜索失败，请稍后重试")
      setResults([])
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }, [query, rememberSearch])

  return { query, setQuery, results, searched, loading, error, recentSearches, handleSearch }
}
