"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Plus, BookOpen, Loader, Trash2 } from "lucide-react"
import { useSessionList } from "./hooks"
import { useKbInfo } from "../../../hooks"
import { KbContext } from "./kb-context"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function ChatLayout({ children, params }: Props) {
  const { id } = use(params)
  const pathname = usePathname()
  const router = useRouter()
  const { grouped, loading, loadingMore, hasMore, loadMore, refresh, deleteSession } = useSessionList(id)
  const { kb } = useKbInfo(id)
  const isNewChat = pathname === `/dashboard/kb/${id}/chat`
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 路由变化时刷新会话列表（新建会话后 router.replace 会触发此处）
  useEffect(() => {
    refresh()
  }, [pathname])

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId)
      // 若删除的是当前会话，跳到新建对话页
      if (pathname === `/dashboard/kb/${id}/chat/${sessionId}`) {
        router.push(`/dashboard/kb/${id}/chat`)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[224px] flex-shrink-0 border-r border-[#eeeef0] bg-[#f7f7f8] flex flex-col">
        <div className="p-3 border-b border-[#eeeef0] space-y-2.5">
          <div className="flex items-center gap-2 px-1 pt-0.5">
            <div className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center flex-shrink-0"
              style={{ background: "#f4f4f5" }}>
              <BookOpen size={11} strokeWidth={2} className="text-zinc-500" />
            </div>
            <span className="text-[12.5px] font-semibold text-[#35353d] truncate">{kb?.name ?? "知识库"}</span>
          </div>
          <Link href={`/dashboard/kb/${id}/chat`} className={`w-full h-8 flex items-center justify-center gap-1.5 rounded-[8px] border-[1.5px] text-[12px] font-medium transition-all ${
            isNewChat
              ? "border-zinc-700 bg-zinc-900 text-white border-solid"
              : "border-dashed border-[#d8d8de] text-[#aaabb2] hover:border-zinc-500 hover:text-zinc-600 hover:bg-zinc-100 hover:border-solid"
          }`}>
            <Plus size={12} strokeWidth={2.5} />
            新建会话
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="flex items-center justify-center h-12">
              <Loader size={16} className="animate-spin text-[#c0c0c8]" />
            </div>
          ) : Object.entries(grouped).length === 0 ? (
            <div className="flex items-center justify-center h-12 text-[12px] text-[#aaabb2]">
              暂无会话
            </div>
          ) : (
            Object.entries(grouped).map(([group, sessions]) => (
              <div key={group}>
                <p className="px-2 py-1.5 text-[10px] font-semibold text-[#c0c0c8] uppercase tracking-[0.07em]">
                  {group}
                </p>
                {sessions.map((s) => {
                  const href = `/dashboard/kb/${id}/chat/${s.id}`
                  const isActive = pathname === href
                  const isDeleting = deletingId === s.id
                  return (
                    <div key={s.id} className="relative group mb-0.5">
                      <Link
                        href={href}
                        className={`block px-2.5 py-2 pr-8 rounded-[8px] transition-all border ${
                          isActive
                            ? "bg-zinc-900 border-zinc-700 text-white"
                            : "border-transparent text-[#55555e] hover:bg-[#ededf0]"
                        }`}
                      >
                        <p className={`text-[12.5px] leading-snug truncate ${isActive ? "font-semibold text-white" : "font-medium"}`}>
                          {s.title}
                        </p>
                        <p className="text-[11px] text-[#c0c0c8] mt-0.5">
                          {s.messageCount ? `${s.messageCount} 条消息` : "新会话"}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, s.id)}
                        disabled={isDeleting}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-[6px] flex items-center justify-center transition-all disabled:opacity-40 ${
                          isActive
                            ? "opacity-0 group-hover:opacity-100 hover:bg-white/15 text-white/70 hover:text-white"
                            : "opacity-0 group-hover:opacity-100 hover:bg-zinc-200 text-[#aaabb2] hover:text-red-500"
                        }`}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))
          )}
          {hasMore && (
            <div className="px-2 pb-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full h-7 text-[11.5px] text-[#aaabb2] hover:text-zinc-600 hover:bg-[#ededf0] rounded-[6px] transition-colors disabled:opacity-50"
              >
                {loadingMore ? "加载中…" : "加载更多"}
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <KbContext.Provider value={kb ?? null}>{children}</KbContext.Provider>
      </div>
    </div>
  )
}
