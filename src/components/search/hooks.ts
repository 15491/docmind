"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { http, ApiError } from "@/lib/request"
import type { SearchResult } from "./types"
import { RECENT_SEARCHES } from "./constants"

const SEARCH_HISTORY_KEY = "docmind:search-history"
const MAX_RECENT_SEARCHES = 6
const searchHistoryListeners = new Set<() => void>()
const DEFAULT_RECENT_SEARCHES = dedupeRecentSearches(RECENT_SEARCHES)

let cachedSearchHistoryRaw: string | null | undefined
let cachedSearchHistorySnapshot: string[] = []

function dedupeRecentSearches(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, MAX_RECENT_SEARCHES)
}

function parseStoredRecentSearches(raw: string | null): string[] | null {
  if (raw === null) {
    return null
  }

  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) {
    return null
  }

  return dedupeRecentSearches(parsed.filter((item): item is string => typeof item === "string"))
}

function getStoredRecentSearches() {
  if (typeof window === "undefined") {
    return cachedSearchHistorySnapshot
  }

  try {
    const stored = window.localStorage.getItem(SEARCH_HISTORY_KEY)
    if (stored === cachedSearchHistoryRaw) {
      return cachedSearchHistorySnapshot
    }

    cachedSearchHistoryRaw = stored
    cachedSearchHistorySnapshot = parseStoredRecentSearches(stored) ?? []
    return cachedSearchHistorySnapshot
  } catch {
    cachedSearchHistoryRaw = null
    cachedSearchHistorySnapshot = []
    return cachedSearchHistorySnapshot
  }
}

function writeStoredRecentSearches(items: string[]) {
  if (typeof window === "undefined") {
    return
  }

  const nextRecentSearches = dedupeRecentSearches(items)
  const nextRaw = nextRecentSearches.length > 0 ? JSON.stringify(nextRecentSearches) : null

  try {
    if (nextRaw) {
      window.localStorage.setItem(SEARCH_HISTORY_KEY, nextRaw)
    } else {
      window.localStorage.removeItem(SEARCH_HISTORY_KEY)
    }

    cachedSearchHistoryRaw = nextRaw
    cachedSearchHistorySnapshot = nextRecentSearches
    emitSearchHistoryChange()
  } catch {
    // 忽略存储失败，保持搜索流程可用
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
      cachedSearchHistoryRaw = event.newValue
      cachedSearchHistorySnapshot = parseStoredRecentSearches(event.newValue) ?? []
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
    () => []
  )

  const rememberSearch = useCallback((keyword: string) => {
    writeStoredRecentSearches([keyword, ...recentSearches])
  }, [recentSearches])

  const removeRecentSearch = useCallback((keyword: string) => {
    writeStoredRecentSearches(recentSearches.filter((item) => item !== keyword))
  }, [recentSearches])

  const clearRecentSearches = useCallback(() => {
    writeStoredRecentSearches([])
  }, [])

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

  return {
    query,
    setQuery,
    results,
    searched,
    loading,
    error,
    recentSearches,
    suggestedSearches: DEFAULT_RECENT_SEARCHES,
    handleSearch,
    removeRecentSearch,
    clearRecentSearches,
  }
}
