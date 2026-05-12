"use client"

import { use } from "react"
import Link from "next/link"
import { FileText, Globe, Paperclip, Send, Shield, Sparkles, Upload } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { getStatusBadgeClass } from "@/lib/status-badge"
import { AIAvatar, AnalysisSection } from "./components"
import { SUGGESTIONS } from "./constants"
import { useChat } from "./hooks"
import { useKb } from "../kb-context"

const CONTENT_X_PADDING = "px-8"

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return <ChatPageContent key={`${id}:new`} id={id} />
}

function ChatPageContent({ id }: { id: string }) {
  const { kb } = useKb()
  const kbName = kb?.name ?? "知识库"
  const docCount = kb?.documentCount ?? 0
  const { messages, input, setInput, streaming, searching, error, textareaRef, bottomRef, handleSend } = useChat(id)

  if (docCount === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
        <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-[14px]">
          <Upload size={22} strokeWidth={1.6} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-foreground mb-1.5 text-[14px] font-semibold">知识库还没有文档。</p>
          <p className="text-muted-foreground max-w-xs text-[12.5px] leading-relaxed">
            上传 PDF、Markdown 或 TXT 文档后，AI 才能基于文档内容回答你的问题。
          </p>
        </div>
        <Link
          href={`/dashboard/kb/${id}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 items-center gap-2 rounded-[9px] px-5 text-[13px] font-semibold transition-colors"
        >
          <Upload size={13} strokeWidth={2} />
          去上传文档
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-6 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:w-1">
        {messages.length === 0 && !streaming ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-10">
            <div className="bg-primary flex h-12 w-12 items-center justify-center rounded-[14px]">
              <Sparkles size={20} strokeWidth={1.8} className="text-primary-foreground" />
            </div>
            <div className="text-center">
              <p className="text-foreground mb-1.5 text-[15px] font-semibold">你想问什么？</p>
              <p className="text-muted-foreground text-[12.5px]">基于“{kbName}”中的 {docCount} 篇文档回答。</p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  className="border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground w-full rounded-[10px] border px-4 py-2.5 text-left text-[13px] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <div className={`flex items-center gap-3 ${CONTENT_X_PADDING}`}>
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-[11px] font-medium">
              {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
            </span>
            <div className="bg-border h-px flex-1" />
          </div>
        ) : null}

        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className={`flex justify-end ${CONTENT_X_PADDING}`}>
              <div className="bg-muted text-foreground max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] leading-[1.7] whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className={`flex gap-3 ${CONTENT_X_PADDING}`}>
              <AIAvatar />
              <div className="min-w-0 flex-1">
                <MarkdownContent>{msg.content}</MarkdownContent>
                <AnalysisSection
                  analysis={msg.analysis}
                  pending={msg.analysisPending}
                  animate
                  onFollowUp={handleSend}
                />
                {msg.sources && msg.sources.length > 0 ? (
                  <div className="border-border mt-3.5 border-t pt-3">
                    <div className="text-muted-foreground mb-2 flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
                      <Paperclip size={10} strokeWidth={2} />
                      引用来源
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((source, index) => (
                        <span
                          key={index}
                          className="border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors"
                        >
                          <FileText size={10} strokeWidth={2} />
                          {source.fileName} · 第 {source.chunkIndex} 段
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        )}

        {(streaming || searching) && (messages.length === 0 || messages[messages.length - 1].role === "user") ? (
          <div className={`flex gap-3 ${CONTENT_X_PADDING}`}>
            <AIAvatar />
            <div className="min-w-0 flex-1">
              {searching ? (
                <div className="text-muted-foreground flex items-center gap-2 text-[12.5px]">
                  <Globe size={12} strokeWidth={2} />
                  正在联网搜索
                  <span className="cursor-blink">▌</span>
                </div>
              ) : (
                <div className="text-foreground flex items-center gap-1 text-[14px] leading-[1.7]">
                  <span className="cursor-blink">▌</span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      <div className="border-border bg-background flex-shrink-0 border-t px-8 py-4">
        {error ? (
          <div className={`mb-3 ${getStatusBadgeClass("error")} px-3.5 py-2`}>{error}</div>
        ) : null}
        <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px]">
          <Shield size={11} strokeWidth={2} />
          回答基于知识库文档，必要时 AI 会自动联网补充。
        </div>
        <div className="border-input bg-muted focus-within:border-ring focus-within:ring-ring/40 focus-within:bg-background flex items-end gap-2 rounded-[14px] border px-3 py-2 transition-colors focus-within:ring-2">
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
            className="text-foreground placeholder:text-muted-foreground min-h-9 max-h-[120px] flex-1 resize-none bg-transparent px-1 py-2 font-sans text-[14px] leading-5 outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || streaming}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  )
}
