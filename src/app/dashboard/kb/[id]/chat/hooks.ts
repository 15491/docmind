"use client"

import { useState, useRef, useEffect } from "react"
import type { Message } from "./types"

export function useChat(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content }])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setStreaming(true)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "这是基于知识库文档生成的回答。实际应用中，这里会通过 SSE 流式输出 GLM 模型的真实回答，并附带来自文档的精准引用溯源。",
          sources: [{ name: "api-doc.pdf", chunk: 1 }],
        },
      ])
      setStreaming(false)
    }, 1500)
  }

  return { messages, input, setInput, streaming, textareaRef, bottomRef, handleSend }
}
