"use client"

import { use } from "react"
import Link from "next/link"
import { FileText, Send, Shield, Paperclip, Upload, Sparkles } from "lucide-react"
import { SUGGESTIONS } from "./constants"
import { useChat } from "./hooks"
import { useKb } from "./kb-context"
import { AIAvatar } from "./components"

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const kb = useKb()
  const kbName = kb?.name ?? "知识库"
  const docCount = kb?.documentCount ?? 0
  const { messages, input, setInput, streaming, error, textareaRef, bottomRef, handleSend } = useChat(id)

  const header = (
    <header className="h-[52px] px-6 flex items-center justify-between border-b border-[#ebebed] flex-shrink-0 bg-white">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[14px] font-bold text-[#0f0f10] tracking-tight flex-shrink-0">{kbName}</span>
        {docCount > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold text-emerald-700 flex-shrink-0"
            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.22)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {docCount} 篇文档
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-200 text-[11px] font-semibold text-amber-600 flex-shrink-0 bg-amber-50">
            暂无文档
          </span>
        )}
      </div>
      <Link
        href={`/dashboard/kb/${id}`}
        className="h-8 px-3 flex items-center gap-1.5 rounded-[8px] border-[1.5px] border-[#ebebed] text-[12px] font-semibold text-[#62636b] hover:border-[#d0d0d8] hover:text-[#0f0f10] hover:bg-[#fafafa] transition-all flex-shrink-0 ml-3"
      >
        <FileText size={12} strokeWidth={1.8} />
        管理文档
      </Link>
    </header>
  )

  if (docCount === 0) {
    return (
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-14 h-14 rounded-[14px] bg-zinc-100 flex items-center justify-center">
            <Upload size={22} strokeWidth={1.6} className="text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#35353d] mb-1.5">知识库还没有文档</p>
            <p className="text-[12.5px] text-[#aaabb2] leading-relaxed max-w-xs">
              上传 PDF、Markdown 或 TXT 文件后，AI 才能基于文档内容回答你的问题
            </p>
          </div>
          <Link
            href={`/dashboard/kb/${id}`}
            className="h-9 px-5 rounded-[9px] bg-zinc-900 text-white text-[13px] font-semibold hover:bg-zinc-700 transition-colors flex items-center gap-2"
          >
            <Upload size={13} strokeWidth={2} />
            去上传文档
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      {header}

      <div className="flex-1 overflow-y-auto py-8 flex flex-col gap-[22px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#e8e8ec] [&::-webkit-scrollbar-thumb]:rounded-full">
        {messages.length === 0 && !streaming && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12">
            <div className="w-12 h-12 rounded-[14px] bg-zinc-900 flex items-center justify-center">
              <Sparkles size={20} strokeWidth={1.8} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-[#0f0f10] mb-1.5">有什么想问的？</p>
              <p className="text-[12.5px] text-[#aaabb2]">基于「{kbName}」的 {docCount} 篇文档回答</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className="w-full text-left px-4 py-2.5 rounded-[10px] border border-[#ebebed] text-[13px] text-[#62636b] hover:border-zinc-300 hover:text-[#0f0f10] hover:bg-[#fafafa] transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex items-center gap-3 px-6">
            <div className="flex-1 h-px bg-[#f0f0f3]" />
            <span className="text-[11px] text-[#aaabb2] font-medium">
              {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <div className="flex-1 h-px bg-[#f0f0f3]" />
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 px-6 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "user" ? (
              <div
                className="max-w-[58%] text-white/95 px-4 py-2.5 rounded-[20px_20px_5px_20px] text-[14px] leading-[1.65] font-normal tracking-[-0.1px]"
                style={{ background: "#18181b", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}
              >
                {msg.content}
              </div>
            ) : (
              <>
                <AIAvatar />
                <div
                  className="max-w-[70%] bg-white rounded-[4px_14px_14px_14px] px-4 py-3.5"
                  style={{ border: "1px solid #ebebed", borderLeft: "2.5px solid #18181b", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
                >
                  <p className="text-[14px] leading-[1.75] text-[#222225] whitespace-pre-line">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#f2f2f5]">
                      <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-[#c8c8d0] uppercase tracking-wider">
                        <Paperclip size={10} strokeWidth={2} />引用来源
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-semibold text-emerald-700 cursor-pointer transition-all hover:-translate-y-px"
                            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.22)" }}
                          >
                            <FileText size={10} strokeWidth={2} className="text-emerald-500" />
                            {s.fileName} · 第 {s.chunkIndex} 段
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {streaming && (
          <div className="flex gap-3 px-6">
            <AIAvatar />
            <div
              className="bg-white rounded-[4px_14px_14px_14px] px-4 py-3.5"
              style={{ border: "1px solid #e4e4e7", borderLeft: "2.5px solid #18181b", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-2 text-[11.5px] font-medium text-[#c0c0c8]">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
                正在基于知识库内容生成回答…
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 pb-[18px] pt-3.5 border-t border-[#ebebed] bg-white flex-shrink-0">
        {error && (
          <div className="mb-2.5 px-3.5 py-2 rounded-[8px] bg-red-50 border border-red-200 text-[12px] text-red-600">
            {error}
          </div>
        )}
        <div className={`flex items-end gap-2.5 rounded-[14px] px-4 py-2.5 transition-all ${
          streaming
            ? "border-[1.5px] border-[#e2e2e8] bg-[#fafafa]"
            : "border-[1.5px] border-[#e2e2e8] bg-[#fafafa] focus-within:border-zinc-700 focus-within:bg-white focus-within:shadow-[0_0_0_3.5px_rgba(0,0,0,0.07)]"
        }`}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px" }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={streaming}
            placeholder="基于知识库内容提问…"
            className="flex-1 bg-transparent outline-none resize-none text-[14px] text-[#0f0f10] placeholder:text-[#c8c8d0] leading-[1.55] max-h-[130px] disabled:opacity-50 font-sans"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
          >
            <Send size={14} strokeWidth={2} className="text-white" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[#aaabb2]">
          <Shield size={11} strokeWidth={2} />
          回答仅基于已上传的文档内容，不受大模型训练数据影响
        </div>
      </div>
    </>
  )
}
