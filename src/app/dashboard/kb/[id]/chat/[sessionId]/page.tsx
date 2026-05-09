"use client"

import { use } from "react"
import { FileText, Paperclip, Send, Shield } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { AIAvatar, AnalysisSection } from "../components"
import { useChat } from "../hooks"

const CONTENT_X_PADDING = "px-8"

export default function SessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = use(params)

  return <SessionPageContent key={`${id}:${sessionId}`} id={id} sessionId={sessionId} />
}

function SessionPageContent({ id, sessionId }: { id: string; sessionId: string }) {
  const { messages, input, setInput, streaming, error, textareaRef, bottomRef, handleSend } = useChat(id, sessionId)

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto py-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#e8e8ec] [&::-webkit-scrollbar]:w-1">
        <div className={`flex items-center gap-3 ${CONTENT_X_PADDING}`}>
          <div className="h-px flex-1 bg-[#f0f0f3]" />
          <span className="text-[11px] font-medium text-[#aaabb2]">
            {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <div className="h-px flex-1 bg-[#f0f0f3]" />
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${CONTENT_X_PADDING} ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "user" ? (
              <div
                className="max-w-[58%] rounded-[20px_20px_5px_20px] px-4 py-2.5 text-[14px] font-normal leading-[1.65] text-white/95"
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

        {streaming && (messages.length === 0 || messages[messages.length - 1].role === "user") ? (
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
        <div className="flex items-end gap-2.5 rounded-[14px] border-[1.5px] border-[#e2e2e8] bg-[#fafafa] px-4 py-2.5 transition-all focus-within:border-zinc-700 focus-within:bg-white focus-within:shadow-[0_0_0_3.5px_rgba(0,0,0,0.07)]">
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
          回答仅基于已上传文档内容，不受大模型训练数据影响。
        </div>
      </div>
    </>
  )
}
