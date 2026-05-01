"use client"

import { useState, useRef, useEffect } from "react"
import type { Message } from "./types"

export function useChat(kbId: string, sessionId?: string, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId && messages.length === 0) {
      fetch(`/api/sessions/${sessionId}/messages`)
        .then(r => r.json())
        .then(data => setMessages(data.messages ?? []))
        .catch(err => setError(err instanceof Error ? err.message : 'Failed to load messages'))
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return

    try {
      setError(null)
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      }
      setMessages((prev) => [...prev, userMessage])
      setInput("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
      setStreaming(true)

      // 发起 SSE 请求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: content,
          kbId,
          sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let aiContent = ''
      let aiId = crypto.randomUUID()
      let sources: Message['sources'] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let i = 0
        while (i < lines.length) {
          const line = lines[i]

          if (line.startsWith('event: chunk')) {
            const dataLine = lines[i + 1]
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6)) as { content: string }
                aiContent += data.content
                setMessages((prev) => {
                  const last = prev[prev.length - 1]
                  if (last?.role === 'assistant' && last.id === aiId) {
                    return [...prev.slice(0, -1), { ...last, content: aiContent }]
                  }
                  return [...prev, { id: aiId, role: 'assistant', content: aiContent, sources }]
                })
              } catch {
                // 忽略 JSON 解析错误
              }
            }
            i += 2
          } else if (line.startsWith('event: sources')) {
            const dataLine = lines[i + 1]
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6)) as { sources: Message['sources'] }
                sources = data.sources
              } catch {
                // 忽略 JSON 解析错误
              }
            }
            i += 2
          } else if (line.startsWith('event: error')) {
            const dataLine = lines[i + 1]
            if (dataLine?.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6)) as { message: string }
                setError(data.message)
              } catch { /* ignore */ }
            }
            i += 2
          } else if (line.startsWith('event: done')) {
            i += 2
          } else {
            i++
          }
        }
      }

      setStreaming(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setStreaming(false)
    }
  }

  return { messages, input, setInput, streaming, error, textareaRef, bottomRef, handleSend }
}

interface Session {
  id: string
  title: string
  messageCount: number
  createdAt: string | Date
}

function groupSessionsByDate(sessions: Session[]): Record<string, Session[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const grouped: Record<string, Session[]> = {}

  for (const session of sessions) {
    const createdDate = new Date(session.createdAt)
    createdDate.setHours(0, 0, 0, 0)

    let group = '更早'
    if (createdDate.getTime() === today.getTime()) {
      group = '今天'
    } else if (createdDate.getTime() === yesterday.getTime()) {
      group = '昨天'
    }

    ;(grouped[group] ??= []).push(session)
  }

  return grouped
}

export function useSessionList(kbId: string) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [grouped, setGrouped] = useState<Record<string, Session[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sessions?kbId=${kbId}`)
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json() as { sessions: Session[]; nextCursor: string | null }
      setSessions(data.sessions ?? [])
      setGrouped(groupSessionsByDate(data.sessions ?? []))
      setNextCursor(data.nextCursor ?? null)
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    try {
      setLoadingMore(true)
      const response = await fetch(`/api/sessions?kbId=${kbId}&cursor=${nextCursor}`)
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json() as { sessions: Session[]; nextCursor: string | null }
      const merged = [...sessions, ...(data.sessions ?? [])]
      setSessions(merged)
      setGrouped(groupSessionsByDate(merged))
      setNextCursor(data.nextCursor ?? null)
    } catch (err) {
      console.error('Failed to load more sessions:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [kbId])

  return { grouped, loading, loadingMore, hasMore: !!nextCursor, loadMore, refresh: fetchSessions }
}
