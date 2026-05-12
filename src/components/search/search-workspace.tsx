"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, ChevronRight, FileSearch, FileText, MessageSquare, Search, X } from "lucide-react"
import { getStatusBadgeClass } from "@/lib/status-badge"
import { ScoreBadge } from "./components"
import { useSearch } from "./hooks"
import type { SearchResult } from "./types"

type SearchWorkspaceProps = {
  variant?: "page" | "dialog"
  autoFocus?: boolean
  onNavigate?: () => void
  showHero?: boolean
}

function resultPreviewHref(result: SearchResult) {
  return `/dashboard/kb/${result.kbId}/docs/${result.docId}`
}

function resultChatHref(result: SearchResult) {
  return `/dashboard/kb/${result.kbId}/chat`
}

export function SearchWorkspace({
  variant = "page",
  autoFocus = false,
  onNavigate,
  showHero = true,
}: SearchWorkspaceProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    query,
    setQuery,
    results,
    searched,
    loading,
    error,
    recentSearches,
    suggestedSearches,
    handleSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearch()

  useEffect(() => {
    if (!autoFocus) return

    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 20)

    return () => window.clearTimeout(timer)
  }, [autoFocus])

  const goTo = (href: string) => {
    onNavigate?.()
    router.push(href)
  }

  const wrapperClassName = variant === "dialog"
    ? "flex h-[min(78vh,760px)] flex-col bg-card"
    : "mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 py-6"

  const shellClassName = variant === "dialog"
    ? "flex min-h-0 flex-1 flex-col"
    : "mt-6 flex min-h-0 flex-1 flex-col rounded-[20px] border border-border bg-card shadow-sm"

  const handleResultKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, href: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      goTo(href)
    }
  }

  return (
    <div className={wrapperClassName}>
      {variant === "page" && showHero && (
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            <Search size={12} strokeWidth={2} />
            全局快捷搜索
          </div>
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-foreground">跨知识库定位内容</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            默认先定位命中文档，再决定是否进入对话。这样比直接跳聊天更稳定，也更容易核对原文。
          </p>
          <p className="mt-3 text-[12px] text-muted-foreground">你也可以随时按 Ctrl + K / ⌘ + K 唤出快捷搜索。</p>
        </div>
      )}

      <div className={shellClassName}>
        <div className={`border-b border-border ${variant === "dialog" ? "px-5 pt-5 pb-4" : "px-6 pt-6 pb-5"}`}>
          {variant === "dialog" && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-foreground">全局搜索</p>
                <p className="mt-1 text-[12px] text-muted-foreground">优先打开命中文档，再决定是否进入对话。</p>
              </div>
              <div className="hidden items-center gap-1.5 rounded-[10px] border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex">
                <span className="rounded-[6px] border border-border bg-card px-1.5 py-0.5">Ctrl</span>
                <span>+</span>
                <span className="rounded-[6px] border border-border bg-card px-1.5 py-0.5">K</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-input bg-muted px-4 py-3 transition-all focus-within:border-ring focus-within:bg-background focus-within:ring-2 focus-within:ring-ring/40">
            <Search size={16} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearch()
                }
              }}
              placeholder="搜索所有知识库中的文档片段…"
              className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={!query.trim() || loading}
              className="h-8 flex-shrink-0 rounded-[9px] bg-primary px-3.5 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              搜索
            </button>
          </div>

          {!searched && !loading && recentSearches.length > 0 && (
            <div className="mt-4">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">最近搜索</p>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    className="inline-flex h-8 items-center rounded-full border border-border bg-card pr-1 text-[12px] text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  >
                    <button
                      type="button"
                      onClick={() => void handleSearch(item)}
                      className="h-full rounded-full px-3 text-left"
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      aria-label={`删除最近搜索 ${item}`}
                      onClick={() => removeRecentSearch(item)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X size={12} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!searched && !loading && recentSearches.length === 0 && suggestedSearches.length > 0 && (
            <div className="mt-4">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">推荐搜索</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void handleSearch(item)}
                    className="h-8 rounded-full border border-border px-3 text-[12px] text-muted-foreground transition-all hover:border-foreground/30 hover:bg-muted hover:text-foreground"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${variant === "dialog" ? "px-3 py-3" : "px-4 py-4"}`}>
          {loading && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 text-center">
              <span className="cursor-blink text-muted-foreground">▌</span>
              <div>
                <p className="text-[13px] font-medium text-muted-foreground">正在检索知识库内容</p>
                <p className="mt-1 text-[12px] text-muted-foreground">会返回最相关的文档片段，并优先引导你查看原文。</p>
              </div>
            </div>
          )}

          {!loading && error && searched && (
            <div className={`rounded-[14px] px-4 py-3 text-[12.5px] ${getStatusBadgeClass("error")}`}>
              {error}
            </div>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileSearch size={20} strokeWidth={1.7} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-muted-foreground">没有找到相关内容</p>
                <p className="mt-1 text-[12px] text-muted-foreground">换一个更具体的关键词，或从文档标题、术语、章节名切入。</p>
              </div>
            </div>
          )}

          {!loading && !error && searched && results.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  找到 {results.length} 条命中
                </p>
                <p className="text-[11px] text-muted-foreground">默认点击结果打开文档预览</p>
              </div>

              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => goTo(resultPreviewHref(result))}
                    onKeyDown={(event) => handleResultKeyDown(event, resultPreviewHref(result))}
                    className="group rounded-[14px] border border-border bg-card p-4 text-left transition-all hover:border-foreground/30 hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-muted text-muted-foreground">
                            <FileText size={14} strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
                              <span className="truncate font-semibold text-foreground">{result.docName}</span>
                              <span className="flex-shrink-0 text-muted-foreground">·</span>
                              <span className="flex-shrink-0 text-muted-foreground">第 {result.chunk} 段</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                              <BookOpen size={11} strokeWidth={2} />
                              <span className="truncate">{result.kbName}</span>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-3 text-[13px] leading-[1.75] text-foreground">
                          {result.content}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <ScoreBadge score={result.score} />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            goTo(resultPreviewHref(result))
                          }}
                          className="hidden h-8 items-center gap-1.5 rounded-[9px] border border-border px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground sm:inline-flex"
                        >
                          查看文档
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            goTo(resultChatHref(result))
                          }}
                          className="hidden h-8 items-center gap-1.5 rounded-[9px] bg-primary px-3 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:inline-flex"
                        >
                          <MessageSquare size={12} strokeWidth={2} />
                          去对话
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <div className="text-[11.5px] text-muted-foreground">
                        先打开文档核对原文，再决定是否继续提问
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        打开文档
                        <ChevronRight size={12} strokeWidth={2.3} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
