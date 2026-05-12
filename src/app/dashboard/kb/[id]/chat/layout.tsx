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
import { useKb } from "../kb-context"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default function ChatLayout({ children, params }: Props) {
  const { id } = use(params)
  const pathname = usePathname()
  const router = useRouter()
  const { grouped, loading, loadingMore, hasMore, loadMore, refresh, deleteSession } = useSessionList(id)
  const { kb } = useKb()
  const isNewChat = pathname === `/dashboard/kb/${id}/chat`
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [pathname, refresh])

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
              className="bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-full overflow-hidden">
        <aside className="flex w-[236px] flex-shrink-0 flex-col border-r border-border bg-muted">
          <div className="border-b border-border px-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-muted">
                  <BookOpen size={14} strokeWidth={1.9} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    知识库
                  </p>
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {kb?.name ?? "知识库"}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/kb/${id}/chat`}
                className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[9px] border-[1.5px] text-[12.5px] font-medium transition-all ${
                  isNewChat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-dashed border-input text-muted-foreground hover:border-foreground/30 hover:border-solid hover:bg-muted hover:text-foreground"
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
                <Loader size={16} className="animate-spin text-muted-foreground" />
              </div>
            ) : Object.entries(grouped).length === 0 ? (
              <div className="flex h-14 items-center justify-center text-[12px] text-muted-foreground">
                暂无会话
              </div>
            ) : (
              Object.entries(grouped).map(([group, sessions]) => (
                <section key={group} className="mb-3 last:mb-0">
                  <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
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
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-transparent text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <p className={`truncate text-[12.5px] leading-snug ${isActive ? "font-semibold text-primary-foreground" : "font-medium"}`}>
                            {session.title}
                          </p>
                          <p className={`mt-1 text-[11px] ${isActive ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                              ? "opacity-0 text-primary-foreground/70 group-hover:opacity-100 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                              : "opacity-0 text-muted-foreground group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
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
                  className="h-8 w-full rounded-[8px] text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden bg-background">{children}</div>
      </div>
    </>
  )
}
