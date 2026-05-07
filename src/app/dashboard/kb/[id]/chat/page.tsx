"use client"

import { use } from "react"
import Link from "next/link"
import { FileText, Globe, Paperclip, Send, Shield, Sparkles, Upload } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { AIAvatar, AnalysisSection } from "./components"
import { SUGGESTIONS } from "./constants"
import { useChat } from "./hooks"
import { useKb } from "../kb-context"

const CONTENT_X_PADDING = "px-8"

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { kb } = useKb()
  const kbName = kb?.name ?? "知识库"
  const docCount = kb?.documentCount ?? 0
  const { messages, input, setInput, streaming, searching, error, textareaRef, bottomRef, handleSend } = useChat(id)

  if (docCount === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-zinc-100">
          <Upload size={22} strokeWidth={1.6} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="mb-1.5 text-[14px] font-semibold text-[#35353d]">知识库还没有文档。</p>
          <p className="max-w-xs text-[12.5px] leading-relaxed text-[#aaabb2]">
            上传 PDF、Markdown 或 TXT 文档后，AI 才能基于文档内容回答你的问题。
          </p>
        </div>
        <Link
          href={`/dashboard/kb/${id}`}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-zinc-900 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          <Upload size={13} strokeWidth={2} />
          去上传文档
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#e8e8ec] [&::-webkit-scrollbar]:w-1">
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-zinc-900">
              <Sparkles size={20} strokeWidth={1.8} className="text-white" />
            </div>
            <div className="text-center">
              <p className="mb-1.5 text-[15px] font-semibold text-[#0f0f10]">你想问什么？</p>
              <p className="text-[12.5px] text-[#aaabb2]">基于“{kbName}”中的 {docCount} 篇文档回答。</p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="w-full rounded-[10px] border border-[#ebebed] px-4 py-2.5 text-left text-[13px] text-[#62636b] transition-all hover:border-zinc-300 hover:bg-[#fafafa] hover:text-[#0f0f10]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <div className={`flex items-center gap-3 ${CONTENT_X_PADDING}`}>
            <div className="h-px flex-1 bg-[#f0f0f3]" />
            <span className="text-[11px] font-medium text-[#aaabb2]">
              {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <div className="h-px flex-1 bg-[#f0f0f3]" />
          </div>
        ) : null}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${CONTENT_X_PADDING} ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "user" ? (
              <div
                className="max-w-[58%] rounded-[20px_20px_5px_20px] px-4 py-2.5 text-[14px] font-normal leading-[1.65] tracking-[-0.1px] text-white/95"
                style={{ background: "#18181b", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }}
              >
                {msg.content}
              </div>
            ) : (
              <>
                <AIAvatar />
                <div
                  className="max-w-[70%] rounded-[4px_14px_14px_14px] bg-white px-4 py-3.5"
                  style={{
                    border: "1px solid #ebebed",
                    borderLeft: "2.5px solid #18181b",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
                  }}
                >
                  <MarkdownContent>{msg.content}</MarkdownContent>
                  <AnalysisSection
                    analysis={msg.analysis}
                    pending={msg.analysisPending}
                    animate
                    onFollowUp={handleSend}
                  />
                  {msg.sources && msg.sources.length > 0 ? (
                    <div className="mt-3.5 border-t border-[#f2f2f5] pt-3">
                      <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#c8c8d0]">
                        <Paperclip size={10} strokeWidth={2} />
                        引用来源
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((source, index) => (
                          <span
                            key={index}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 transition-all hover:-translate-y-px"
                            style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.22)" }}
                          >
                            <FileText size={10} strokeWidth={2} className="text-emerald-500" />
                            {source.fileName} · 第 {source.chunkIndex} 段
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ))}

        {(streaming || searching) && (messages.length === 0 || messages[messages.length - 1].role === "user") ? (
          <div className={`flex gap-3 ${CONTENT_X_PADDING}`}>
            <AIAvatar />
            <div
              className="rounded-[4px_14px_14px_14px] bg-white px-4 py-3.5"
              style={{
                border: "1px solid #e4e4e7",
                borderLeft: "2.5px solid #18181b",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 3px rgba(0,0,0,0.04)",
              }}
            >
              {searching ? (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-blue-400">
                  <Globe size={12} strokeWidth={2} className="animate-pulse" />
                  正在联网搜索…
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11.5px] font-medium text-[#c0c0c8]">
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1 w-1 animate-bounce rounded-full bg-zinc-400"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      />
                    ))}
                  </div>
                  正在基于知识库内容生成回答…
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 border-t border-[#ebebed] bg-white px-8 py-4">
        {error ? (
          <div className="mb-3 rounded-[8px] border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] text-red-600">
            {error}
          </div>
        ) : null}
        <div
          className={`flex items-end gap-2.5 rounded-[14px] px-4 py-2.5 transition-all ${
            streaming
              ? "border-[1.5px] border-[#e2e2e8] bg-[#fafafa]"
              : "border-[1.5px] border-[#e2e2e8] bg-[#fafafa] focus-within:border-zinc-700 focus-within:bg-white focus-within:shadow-[0_0_0_3.5px_rgba(0,0,0,0.07)]"
          }`}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              event.target.style.height = "auto"
              event.target.style.height = event.target.scrollHeight + "px"
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
            disabled={streaming}
            placeholder="基于知识库内容提问…"
            className="max-h-[130px] flex-1 resize-none bg-transparent font-sans text-[14px] leading-[1.55] text-[#0f0f10] outline-none placeholder:text-[#c8c8d0] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
          >
            <Send size={14} strokeWidth={2} className="text-white" />
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#aaabb2]">
          <Shield size={11} strokeWidth={2} />
          回答基于知识库文档，必要时 AI 会自动联网补充。
        </div>
      </div>
    </>
  )
}
