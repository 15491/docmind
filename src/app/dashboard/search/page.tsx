"use client"

import Link from "next/link"
import { Search, FileText, BookOpen, ChevronRight } from "lucide-react"
import { RECENT_SEARCHES } from "./constants"
import { ScoreBadge } from "./components"
import { useSearch } from "./hooks"

export default function SearchPage() {
  const { query, setQuery, results, searched, loading, handleSearch } = useSearch()

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="px-8 pt-8 pb-6 max-w-2xl">
        <h1 className="text-[15px] font-semibold text-[#0f0f10] tracking-tight mb-1">全库检索</h1>
        <p className="text-[12px] text-[#aaabb2]">跨知识库语义搜索，直接定位相关文档片段</p>
      </div>

      <div className="px-8 max-w-2xl">
        <div className="flex items-center gap-2.5 rounded-[12px] px-4 py-2.5 border-[1.5px] border-[#e2e2e8] bg-[#fafafa] focus-within:border-zinc-700 focus-within:bg-white focus-within:shadow-[0_0_0_3.5px_rgba(0,0,0,0.07)] transition-all">
          <Search size={15} strokeWidth={2} className="text-[#c0c0c8] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="在所有知识库中搜索…"
            className="flex-1 bg-transparent outline-none text-[14px] text-[#0f0f10] placeholder:text-[#c8c8d0] font-sans"
          />
          <button
            onClick={() => handleSearch()}
            disabled={!query.trim() || loading}
            className="h-7 px-3 rounded-[7px] bg-zinc-900 text-white text-[12px] font-semibold hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            搜索
          </button>
        </div>

        {!searched && !loading && (
          <div className="mt-5">
            <p className="text-[11px] font-semibold text-[#c0c0c8] uppercase tracking-wider mb-2.5">最近搜索</p>
            <div className="flex flex-wrap gap-1.5">
              {RECENT_SEARCHES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="h-7 px-3 rounded-full border border-[#e8e8ec] text-[12px] text-[#62636b] hover:border-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-[12.5px] text-[#aaabb2]">正在检索知识库…</p>
          </div>
        )}

        {searched && !loading && (
          <div className="mt-6">
            <p className="text-[11px] font-semibold text-[#c0c0c8] uppercase tracking-wider mb-3">
              找到 {results.length} 条结果
            </p>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Search size={28} strokeWidth={1.3} className="text-[#d0d0d8]" />
                <p className="text-[13px] text-[#aaabb2]">未找到相关内容，换个关键词试试</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.map((r) => (
                  <Link
                    key={r.id}
                    href={`/dashboard/kb/${r.kbId}/chat`}
                    className="group block bg-white border border-[#ebebed] rounded-[10px] p-4 hover:border-zinc-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all"
                    style={{ borderLeft: "2.5px solid #18181b" }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-[6px] bg-zinc-100 flex items-center justify-center flex-shrink-0">
                          <FileText size={11} strokeWidth={2} className="text-zinc-500" />
                        </div>
                        <span className="text-[12.5px] font-semibold text-[#35353d] truncate">{r.docName}</span>
                        <span className="text-[#d8d8de] flex-shrink-0">·</span>
                        <span className="text-[11.5px] text-[#aaabb2] flex-shrink-0">第 {r.chunk} 段</span>
                      </div>
                      <ScoreBadge score={r.score} />
                    </div>

                    <p className="text-[13px] leading-[1.7] text-[#45454e] mb-3">{r.content}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11.5px] text-[#aaabb2]">
                        <BookOpen size={11} strokeWidth={2} />
                        {r.kbName}
                      </div>
                      <span className="flex items-center gap-0.5 text-[11.5px] font-medium text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        去对话 <ChevronRight size={11} strokeWidth={2.5} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
