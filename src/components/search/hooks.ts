"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { http, ApiError } from "@/lib/request"
import type { SearchResult } from "./types"
import { RECENT_SEARCHES } from "./constants"

const SEARCH_HISTORY_KEY = "docmind:search-history"
const MAX_RECENT_SEARCHES = 6
const searchHistoryListeners = new Set<() => void>()

function dedupeRecentSearches(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, MAX_RECENT_SEARCHES)
}

function getStoredRecentSearches() {
  if (typeof window === "undefined") {
    return RECENT_SEARCHES
  }

  try {
    const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!stored) return RECENT_SEARCHES

    const parsed = JSON.parse(stored) as string[]
    return dedupeRecentSearches([...parsed, ...RECENT_SEARCHES])
  } catch {
    return RECENT_SEARCHES
  }
}

function emitSearchHistoryChange() {
  for (const listener of searchHistoryListeners) {
    listener()
  }
}

function subscribeSearchHistory(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SEARCH_HISTORY_KEY) {
      onStoreChange()
    }
  }

  searchHistoryListeners.add(onStoreChange)
  window.addEventListener("storage", handleStorage)

  return () => {
    searchHistoryListeners.delete(onStoreChange)
    window.removeEventListener("storage", handleStorage)
  }
}

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recentSearches = useSyncExternalStore(
    subscribeSearchHistory,
    getStoredRecentSearches,
    () => RECENT_SEARCHES
  )

  const rememberSearch = useCallback((keyword: string) => {
    const nextRecentSearches = dedupeRecentSearches([keyword, ...recentSearches])

    try {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextRecentSearches))
      emitSearchHistoryChange()
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
