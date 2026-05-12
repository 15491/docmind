"use client"

import { use } from "react"
import { FileText, Paperclip, Send, Shield } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { getStatusBadgeClass } from "@/lib/status-badge"
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
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-6 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:w-1">
        <div className={`flex items-center gap-3 ${CONTENT_X_PADDING}`}>
          <div className="bg-border h-px flex-1" />
          <span className="text-muted-foreground text-[11px] font-medium">
            {new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <div className="bg-border h-px flex-1" />
        </div>

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

        {streaming && (messages.length === 0 || messages[messages.length - 1].role === "user") ? (
          <div className={`flex gap-3 ${CONTENT_X_PADDING}`}>
            <AIAvatar />
            <div className="min-w-0 flex-1">
              <div className="text-foreground flex items-center gap-1 text-[14px] leading-[1.7]">
                <span className="cursor-blink">▌</span>
              </div>
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
          回答仅基于已上传文档内容，不受大模型训练数据影响。
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
