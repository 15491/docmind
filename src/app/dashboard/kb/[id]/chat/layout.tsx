"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen, Loader, Plus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSessionList } from "./hooks"
import { useKb } from "./kb-context"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function ChatLayout({ children, params }: Props) {
  const { id } = use(params)
  const pathname = usePathname()
  const router = useRouter()
  const { grouped, loading, loadingMore, hasMore, loadMore, refresh, deleteSession } = useSessionList(id)
  const kb = useKb()
  const isNewChat = pathname === `/dashboard/kb/${id}/chat`
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [pathname])

  const handleDelete = async () => {
    if (!confirmId) return

    setDeletingId(confirmId)
    setConfirmId(null)

    try {
      await deleteSession(confirmId)
      if (pathname === `/dashboard/kb/${id}/chat/${confirmId}`) {
        router.push(`/dashboard/kb/${id}/chat`)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除这条会话吗？会话中的所有消息将被永久删除，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-full overflow-hidden">
        <aside className="flex w-[236px] flex-shrink-0 flex-col border-r border-[#eeeef0] bg-[#f7f7f8]">
          <div className="border-b border-[#eeeef0] px-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px]"
                  style={{ background: "#f4f4f5" }}
                >
                  <BookOpen size={14} strokeWidth={1.9} className="text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#c0c0c8]">
                    知识库
                  </p>
                  <p className="truncate text-[13px] font-semibold text-[#35353d]">
                    {kb?.name ?? "知识库"}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/kb/${id}/chat`}
                className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] text-[12.5px] font-medium transition-all ${
                  isNewChat
                    ? "border-zinc-700 bg-zinc-900 text-white"
                    : "border-dashed border-[#d8d8de] text-[#8e8e97] hover:border-zinc-500 hover:border-solid hover:bg-zinc-100 hover:text-zinc-700"
                }`}
              >
                <Plus size={13} strokeWidth={2.4} />
                新建会话
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <div className="flex h-14 items-center justify-center">
                <Loader size={16} className="animate-spin text-[#c0c0c8]" />
              </div>
            ) : Object.entries(grouped).length === 0 ? (
              <div className="flex h-14 items-center justify-center text-[12px] text-[#aaabb2]">
                暂无会话
              </div>
            ) : (
              Object.entries(grouped).map(([group, sessions]) => (
                <section key={group} className="mb-3 last:mb-0">
                  <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-[#c0c0c8]">
                    {group}
                  </p>

                  {sessions.map((session) => {
                    const href = `/dashboard/kb/${id}/chat/${session.id}`
                    const isActive = pathname === href
                    const isDeleting = deletingId === session.id

                    return (
                      <div key={session.id} className="group relative mb-1 last:mb-0">
                        <Link
                          href={href}
                          className={`block rounded-[10px] border px-3 py-2.5 pr-9 transition-all ${
                            isActive
                              ? "border-zinc-700 bg-zinc-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                              : "border-transparent text-[#55555e] hover:bg-[#ededf0]"
                          }`}
                        >
                          <p className={`truncate text-[12.5px] leading-snug ${isActive ? "font-semibold text-white" : "font-medium"}`}>
                            {session.title}
                          </p>
                          <p className={`mt-1 text-[11px] ${isActive ? "text-white/60" : "text-[#b0b0b8]"}`}>
                            {session.messageCount ? `${session.messageCount} 条消息` : "新会话"}
                          </p>
                        </Link>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            setConfirmId(session.id)
                          }}
                          disabled={isDeleting}
                          className={`absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] transition-all disabled:opacity-40 ${
                            isActive
                              ? "opacity-0 text-white/70 group-hover:opacity-100 hover:bg-white/15 hover:text-white"
                              : "opacity-0 text-[#aaabb2] group-hover:opacity-100 hover:bg-zinc-200 hover:text-red-500"
                          }`}
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    )
                  })}
                </section>
              ))
            )}

            {hasMore ? (
              <div className="px-1 pb-1 pt-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-8 w-full rounded-[8px] text-[11.5px] text-[#aaabb2] transition-colors hover:bg-[#ededf0] hover:text-zinc-600 disabled:opacity-50"
                >
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden bg-white">{children}</div>
      </div>
    </>
  )
}
