"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { http } from "@/lib/request"
import type { Message } from "./types"

export function useChat(kbId: string, sessionId?: string, initialMessages: Message[] = []) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeSessionId = useRef<string | undefined>(sessionId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId && messages.length === 0) {
      http.get<{ messages: Message[] }>(`/api/sessions/${sessionId}/messages`)
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

    setError(null)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content }])
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    setStreaming(true)

    const aiId = crypto.randomUUID()
    let aiContent = ''
    let sources: Message['sources'] = []

    await fetchEventSource('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: content, kbId, sessionId: activeSessionId.current }),
      onmessage(ev) {
        try {
          if (ev.event === 'tool_call') {
            setSearching(true)
          } else if (ev.event === 'chunk') {
            setSearching(false)
            const data = JSON.parse(ev.data) as { content: string }
            aiContent += data.content
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last?.role === 'assistant' && last.id === aiId) {
                return [...prev.slice(0, -1), { ...last, content: aiContent }]
              }
              return [...prev, { id: aiId, role: 'assistant', content: aiContent, sources }]
            })
          } else if (ev.event === 'sources') {
            const data = JSON.parse(ev.data) as { sources: Message['sources'] }
            sources = data.sources
          } else if (ev.event === 'error') {
            const data = JSON.parse(ev.data) as { message: string }
            setError(data.message)
          } else if (ev.event === 'done') {
            const data = JSON.parse(ev.data) as { sessionId?: string }
            if (data.sessionId && !activeSessionId.current) {
              activeSessionId.current = data.sessionId
              router.replace(`/dashboard/kb/${kbId}/chat/${data.sessionId}`)
            }
          }
        } catch { /* ignore parse errors */ }
      },
      onerror(err) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
        throw err // 阻止库自动重连
      },
      onclose() {
        setStreaming(false)
        setSearching(false)
      },
    }).catch(() => {
      setStreaming(false)
      setSearching(false)
    })
  }

  return { messages, input, setInput, streaming, searching, error, textareaRef, bottomRef, handleSend }
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
      const data = await http.get<{ sessions: Session[]; nextCursor: string | null }>(
        `/api/sessions?kbId=${kbId}`
      )
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
      const data = await http.get<{ sessions: Session[]; nextCursor: string | null }>(
        `/api/sessions?kbId=${kbId}&cursor=${nextCursor}`
      )
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

  const deleteSession = async (sessionId: string) => {
    await http.del(`/api/sessions/${sessionId}`)
    const updated = sessions.filter(s => s.id !== sessionId)
    setSessions(updated)
    setGrouped(groupSessionsByDate(updated))
  }

  return { grouped, loading, loadingMore, hasMore: !!nextCursor, loadMore, refresh: fetchSessions, deleteSession }
}
