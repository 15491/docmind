"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, ChevronRight, FileSearch, FileText, MessageSquare, Search } from "lucide-react"
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
  const { query, setQuery, results, searched, loading, error, recentSearches, handleSearch } = useSearch()

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
    ? "flex h-[min(78vh,760px)] flex-col bg-white"
    : "mx-auto flex min-h-full w-full max-w-5xl flex-col px-8 py-6"

  const shellClassName = variant === "dialog"
    ? "flex min-h-0 flex-1 flex-col"
    : "mt-6 flex min-h-0 flex-1 flex-col rounded-[20px] border border-[#ebebed] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]"

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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ececf1] bg-[#fafafa] px-3 py-1 text-[11px] font-semibold text-[#8a8b93]">
            <Search size={12} strokeWidth={2} />
            全局快捷搜索
          </div>
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-[#0f0f10]">跨知识库定位内容</h1>
          <p className="mt-2 text-[13px] leading-6 text-[#8a8b93]">
            默认先定位命中文档，再决定是否进入对话。这样比直接跳聊天更稳定，也更容易核对原文。
          </p>
          <p className="mt-3 text-[12px] text-[#aaabb2]">你也可以随时按 Ctrl + K / ⌘ + K 呼出快捷搜索。</p>
        </div>
      )}

      <div className={shellClassName}>
        <div className={`border-b border-[#f0f0f3] ${variant === "dialog" ? "px-5 pt-5 pb-4" : "px-6 pt-6 pb-5"}`}>
          {variant === "dialog" && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold text-[#0f0f10]">全局搜索</p>
                <p className="mt-1 text-[12px] text-[#8a8b93]">优先打开命中文档，再决定是否进入对话。</p>
              </div>
              <div className="hidden items-center gap-1.5 rounded-[10px] border border-[#ececf1] bg-[#fafafa] px-2.5 py-1 text-[11px] font-medium text-[#8a8b93] sm:flex">
                <span className="rounded-[6px] border border-[#e6e6eb] bg-white px-1.5 py-0.5">Ctrl</span>
                <span>+</span>
                <span className="rounded-[6px] border border-[#e6e6eb] bg-white px-1.5 py-0.5">K</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#e2e2e8] bg-[#fafafa] px-4 py-3 transition-all focus-within:border-zinc-700 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(0,0,0,0.06)]">
            <Search size={16} strokeWidth={2} className="flex-shrink-0 text-[#c0c0c8]" />
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
              className="flex-1 bg-transparent text-[14px] text-[#0f0f10] outline-none placeholder:text-[#c8c8d0]"
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={!query.trim() || loading}
              className="h-8 flex-shrink-0 rounded-[9px] bg-zinc-900 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              搜索
            </button>
          </div>

          {!searched && !loading && recentSearches.length > 0 && (
            <div className="mt-4">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#c0c0c8]">最近搜索</p>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void handleSearch(item)}
                    className="h-8 rounded-full border border-[#e8e8ec] px-3 text-[12px] text-[#62636b] transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-800"
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
              <div className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="h-1.5 w-1.5 rounded-full bg-zinc-300 animate-bounce"
                    style={{ animationDelay: `${index * 0.15}s` }}
                  />
                ))}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#62636b]">正在检索知识库内容</p>
                <p className="mt-1 text-[12px] text-[#aaabb2]">会返回最相关的文档片段，并优先引导你查看原文。</p>
              </div>
            </div>
          )}

          {!loading && error && searched && (
            <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f4f5]">
                <FileSearch size={20} strokeWidth={1.7} className="text-[#b3b3bb]" />
              </div>
              <div>
                <p className="text-[13.5px] font-medium text-[#62636b]">没有找到相关内容</p>
                <p className="mt-1 text-[12px] text-[#aaabb2]">换一个更具体的关键词，或从文档标题、术语、章节名切入。</p>
              </div>
            </div>
          )}

          {!loading && !error && searched && results.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#c0c0c8]">
                  找到 {results.length} 条命中
                </p>
                <p className="text-[11px] text-[#aaabb2]">默认点击结果打开文档预览</p>
              </div>

              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => goTo(resultPreviewHref(result))}
                    onKeyDown={(event) => handleResultKeyDown(event, resultPreviewHref(result))}
                    className="group rounded-[14px] border border-[#ebebed] bg-white p-4 text-left transition-all hover:border-zinc-300 hover:shadow-[0_6px_18px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-zinc-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-zinc-100 text-zinc-500">
                            <FileText size={14} strokeWidth={2} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 text-[12.5px]">
                              <span className="truncate font-semibold text-[#35353d]">{result.docName}</span>
                              <span className="flex-shrink-0 text-[#d8d8de]">·</span>
                              <span className="flex-shrink-0 text-[#8a8b93]">第 {result.chunk} 段</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#aaabb2]">
                              <BookOpen size={11} strokeWidth={2} />
                              <span className="truncate">{result.kbName}</span>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-3 text-[13px] leading-[1.75] text-[#45454e]">
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
                          className="hidden h-8 items-center gap-1.5 rounded-[9px] border border-[#ebebed] px-3 text-[12px] font-medium text-[#62636b] transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-[#0f0f10] sm:inline-flex"
                        >
                          查看文档
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            goTo(resultChatHref(result))
                          }}
                          className="hidden h-8 items-center gap-1.5 rounded-[9px] bg-zinc-900 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-700 sm:inline-flex"
                        >
                          <MessageSquare size={12} strokeWidth={2} />
                          去对话
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-[#f3f3f5] pt-3">
                      <div className="text-[11.5px] text-[#aaabb2]">
                        先打开文档核对原文，再决定是否继续提问
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
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
