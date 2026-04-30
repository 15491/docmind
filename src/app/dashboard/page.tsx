"use client"

import Link from "next/link"
import { Plus, BookOpen, Trash2, MessageSquare, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useKbList } from "./hooks"

export default function DashboardPage() {
  const { kbs, loading, error, open, setOpen, name, setName, handleCreate, handleDelete, deleteKb, setDeleteKb, confirmDelete, creating, deleting } = useKbList()

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="flex items-center justify-between px-8 pt-8 pb-6">
        <div>
          <h1 className="text-[15px] font-semibold text-[#0f0f10] tracking-tight">我的知识库</h1>
          <p className="text-[12px] text-[#aaabb2] mt-0.5">共 {kbs.length} 个</p>
          {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="h-8 px-3.5 flex items-center gap-1.5 rounded-[8px] border border-[#ebebed] bg-white text-[12.5px] font-medium text-[#62636b] hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm"
        >
          <Plus size={12} strokeWidth={2.5} />
          新建知识库
        </button>
      </div>

      <div className="px-8 pb-8 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
        {kbs.map((kb) => (
          <div
            key={kb.id}
            className="group relative bg-white border border-[#ebebed] rounded-[10px] p-5 hover:border-zinc-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] transition-all cursor-pointer"
          >
            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center mb-4" style={{ background: "#f4f4f5" }}>
              <BookOpen size={16} strokeWidth={1.8} className="text-zinc-500" />
            </div>
            <h3 className="text-[13.5px] font-semibold text-[#0f0f10] leading-snug mb-1 pr-8 truncate">
              {kb.name}
            </h3>
            <p className="text-[11.5px] text-[#aaabb2]">
              {kb.documentCount} 篇文档 · {new Date(kb.createdAt).toLocaleDateString()}
            </p>

            <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Link
                href={`/dashboard/kb/${kb.id}/chat`}
                onClick={(e) => e.stopPropagation()}
                className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[#c0c0c8] hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                title="开始问答"
              >
                <MessageSquare size={13} strokeWidth={1.8} />
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); handleDelete(kb) }}
                className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[#c0c0c8] hover:bg-red-50 hover:text-red-500 transition-colors"
                title="删除"
              >
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>

            <Link href={`/dashboard/kb/${kb.id}`} className="absolute inset-0 rounded-[10px]" />
          </div>
        ))}

        <button
          onClick={() => setOpen(true)}
          className="min-h-[130px] bg-white border-[1.5px] border-dashed border-[#d8d8de] rounded-[10px] flex flex-col items-center justify-center gap-2 text-[#c0c0c8] hover:border-zinc-400 hover:text-zinc-500 hover:bg-zinc-50 transition-all"
        >
          <Plus size={20} strokeWidth={1.5} />
          <span className="text-[12.5px] font-medium">新建知识库</span>
        </button>
      </div>

      {loading && (
        <div className="px-8 pb-8">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[#ebebed] rounded-[10px] p-5 animate-pulse"
              >
                <div className="w-9 h-9 rounded-[8px] bg-[#f0f0f3] mb-4" />
                <div className="h-4 bg-[#f0f0f3] rounded mb-2 w-3/4" />
                <div className="h-3 bg-[#f0f0f3] rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && kbs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <BookOpen size={28} strokeWidth={1.3} className="text-[#d0d0d8]" />
          <p className="text-[13px] text-[#aaabb2]">还没有知识库，点击「新建知识库」开始</p>
        </div>
      )}

      <Dialog open={!!deleteKb} onOpenChange={(v) => !v && setDeleteKb(null)}>
        <DialogContent className="bg-white border-[#ebebed] max-w-sm shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除知识库</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-[13px] text-[#62636b] leading-relaxed">
              确定要删除{" "}
              <span className="font-semibold text-[#0f0f10]">「{deleteKb?.name}」</span>{" "}
              吗？该知识库下所有文档和向量索引将同步清除，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <button
              onClick={() => setDeleteKb(null)}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] hover:text-[#62636b] transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="h-8 px-4 rounded-[8px] bg-red-500 text-white text-[12.5px] font-semibold hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? "删除中..." : "确认删除"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white border-[#ebebed] max-w-sm shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">新建知识库</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="输入知识库名称（至少 2 个字符）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="border-[#e2e2e8] text-[#0f0f10] placeholder:text-[#c8c8d0] text-[13px] h-9 focus-visible:ring-zinc-900/20 focus-visible:border-zinc-700"
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => { setOpen(false); setName("") }}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] hover:text-[#62636b] transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={name.trim().length < 2 || creating}
              className="h-8 px-4 rounded-[8px] bg-zinc-900 text-white text-[12.5px] font-semibold hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "创建中..." : "创建"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
