"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { BookOpen, Loader2, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react"
import { DashboardPageHeader } from "@/components/layout/dashboard-shell"
import { PageContent } from "@/components/layout/page-content"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useKbList } from "./hooks"

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const {
    kbs,
    total,
    loading,
    loadingMore,
    hasMore,
    error,
    open,
    setOpen,
    name,
    setName,
    handleCreate,
    handleDelete,
    deleteKb,
    setDeleteKb,
    confirmDelete,
    editKb,
    editName,
    setEditName,
    handleEdit,
    confirmEdit,
    cancelEdit,
    loadMore,
    creating,
    deleting,
    updating,
  } = useKbList()

  useEffect(() => {
    const target = bottomRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          void loadMore()
        }
      },
      {
        root: containerRef.current,
        rootMargin: "200px 0px",
        threshold: 0,
      }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [loadMore])

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-white">
      <DashboardPageHeader
        size="compact"
        breadcrumbs={[{ label: "控制台" }]}
        actions={(
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#ebebed] bg-white px-3.5 text-[12.5px] font-medium text-[#62636b] shadow-sm transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            <Plus size={12} strokeWidth={2.5} />
            新建知识库
          </button>
        )}
      />

      <PageContent className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-semibold tracking-tight text-[#0f0f10]">我的知识库</h1>
            {loadingMore ? <span className="text-[11px] text-[#aaabb2]">正在加载中</span> : null}
          </div>
          <p className="mt-1 text-[12.5px] text-[#8a8b93]">共 {total} 个知识库</p>
          {error ? <p className="mt-2 text-[12px] text-red-500">{error}</p> : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[10px] border border-[#ebebed] bg-white p-5"
              >
                <div className="mb-4 h-9 w-9 rounded-[8px] bg-[#f0f0f3]" />
                <div className="mb-2 h-4 w-3/4 rounded bg-[#f0f0f3]" />
                <div className="h-3 w-1/2 rounded bg-[#f0f0f3]" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && total === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <BookOpen size={28} strokeWidth={1.3} className="text-[#d0d0d8]" />
            <p className="text-[13px] text-[#aaabb2]">还没有知识库，点击“新建知识库”开始。</p>
          </div>
        ) : null}

        {!loading && total > 0 ? (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
              {kbs.map((kb) => (
                <div
                  key={kb.id}
                  className="group relative cursor-pointer rounded-[10px] border border-[#ebebed] bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#f4f4f5]">
                    <BookOpen size={16} strokeWidth={1.8} className="text-zinc-500" />
                  </div>
                  <h3 className="mb-1 truncate pr-14 text-[13.5px] font-semibold leading-snug text-[#0f0f10]">
                    {kb.name}
                  </h3>
                  <p className="text-[11.5px] text-[#aaabb2]">
                    {kb.documentCount} 篇文档 · {new Date(kb.createdAt).toLocaleDateString()}
                  </p>

                  <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link
                      href={`/dashboard/kb/${kb.id}/chat`}
                      onClick={(event) => event.stopPropagation()}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                      title="开始问答"
                    >
                      <MessageSquare size={13} strokeWidth={1.8} />
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        handleEdit(kb)
                      }}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                      title="编辑名称"
                    >
                      <Pencil size={13} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault()
                        handleDelete(kb)
                      }}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-red-50 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>

                  <Link href={`/dashboard/kb/${kb.id}`} className="absolute inset-0 rounded-[10px]" />
                </div>
              ))}

              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-[130px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#d8d8de] bg-white text-[#c0c0c8] transition-all hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-500"
              >
                <Plus size={20} strokeWidth={1.5} />
                <span className="text-[12.5px] font-medium">新建知识库</span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 pb-4">
              <div ref={bottomRef} className="h-1 w-full" />

              {loadingMore ? (
                <div className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#ebebed] bg-white px-4 text-[12px] text-[#8a8b93]">
                  <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                  正在加载更多知识库
                </div>
              ) : hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  className="h-9 rounded-[10px] border border-[#ebebed] px-4 text-[12px] font-medium text-[#62636b] transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  加载更多
                </button>
              ) : (
                <p className="text-[12px] text-[#aaabb2]">已经到底了</p>
              )}
            </div>
          </>
        ) : null}
      </PageContent>

      <Dialog open={!!deleteKb} onOpenChange={(visible) => !visible && setDeleteKb(null)}>
        <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
          <DialogHeader>
            <DialogDescription className="sr-only">
              Delete the selected knowledge base and all related documents.
            </DialogDescription>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除知识库</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-[13px] leading-relaxed text-[#62636b]">
              确定要删除 <span className="font-semibold text-[#0f0f10]">“{deleteKb?.name}”</span> 吗？
              该知识库下所有文档和向量索引都会同步清除，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteKb(null)}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className="h-8 rounded-[8px] bg-red-500 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "删除中..." : "确认删除"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editKb} onOpenChange={(visible) => !visible && cancelEdit()}>
        <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
          <DialogHeader>
            <DialogDescription className="sr-only">
              Rename the selected knowledge base.
            </DialogDescription>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">编辑知识库名称</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="输入新的知识库名称（至少 2 个字符）"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void confirmEdit()}
              className="h-9 border-[#e2e2e8] text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] focus-visible:border-zinc-700 focus-visible:ring-zinc-900/20"
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={cancelEdit}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void confirmEdit()}
              disabled={editName.trim().length < 2 || updating}
              className="h-8 rounded-[8px] bg-zinc-900 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {updating ? "保存中..." : "保存"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
          <DialogHeader>
            <DialogDescription className="sr-only">
              Create a new knowledge base.
            </DialogDescription>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">新建知识库</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="输入知识库名称（至少 2 个字符）"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void handleCreate()}
              className="h-9 border-[#e2e2e8] text-[13px] text-[#0f0f10] placeholder:text-[#c8c8d0] focus-visible:border-zinc-700 focus-visible:ring-zinc-900/20"
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={name.trim().length < 2 || creating}
              className="h-8 rounded-[8px] bg-zinc-900 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "创建中..." : "创建"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
