"use client"

import { useState, useEffect } from "react"
import { X, FileText, ChevronRight, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { http } from "@/lib/request"
import type { Doc, DocStatus } from "./types"
import { STATUS_MAP } from "./constants"

export function StatusBadge({ status }: { status: DocStatus }) {
  const { label, cls, dot } = STATUS_MAP[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {label}
    </span>
  )
}

export function PreviewPanel({ doc, onClose, kbName }: { doc: Doc; onClose: () => void; kbName: string }) {
  const ext = doc.fileName.split(".").pop()?.toLowerCase()
  const isPdf  = ext === "pdf"
  const isText = ext === "txt" || ext === "md"

  const [state, setState] = useState<{
    loading: boolean
    content?: string
    url?: string
    error?: string
  }>({ loading: doc.status === "ready" })

  useEffect(() => {
    if (doc.status !== "ready") return

    http.get<{ url: string }>(`/api/files/${doc.id}`)
      .then(async ({ url }) => {
        if (isText) {
          const res = await fetch(url)
          const content = await res.text()
          setState({ loading: false, content })
        } else {
          setState({ loading: false, url })
        }
      })
      .catch(() => setState({ loading: false, error: "加载预览失败，请稍后重试" }))
  }, [doc.id, doc.status, isText])

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[640px] bg-white z-50 flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.08)] border-l border-[#ebebed]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ebebed] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[7px] bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <FileText size={13} strokeWidth={1.8} className="text-zinc-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#0f0f10] truncate">{doc.fileName}</p>
              <p className="text-[11px] text-[#aaabb2]">{(doc.fileSize / 1024).toFixed(1)}KB · {new Date(doc.createdAt).toLocaleString()}上传</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[#c0c0c8] hover:bg-[#f3f3f5] hover:text-zinc-600 transition-colors flex-shrink-0 ml-3"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-5 py-2 border-b border-[#f5f5f7] flex-shrink-0">
          <span className="text-[11px] text-[#aaabb2]">{kbName}</span>
          <ChevronRight size={11} className="text-[#d8d8de]" />
          <span className="text-[11px] text-[#62636b] font-medium">{doc.fileName}</span>
          <span className="ml-auto">
            <StatusBadge status={doc.status} />
          </span>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {doc.status === "processing" ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-[12.5px] text-[#aaabb2]">文档正在处理中，请稍后查看</p>
            </div>
          ) : doc.status === "failed" ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <X size={18} strokeWidth={2} className="text-red-400" />
              </div>
              <p className="text-[12.5px] text-[#aaabb2]">文档解析失败，无法预览</p>
            </div>
          ) : state.loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-[#aaabb2]">
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
              <span className="text-[12.5px]">加载中…</span>
            </div>
          ) : state.error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[12.5px] text-red-400">{state.error}</p>
            </div>
          ) : isPdf && state.url ? (
            <iframe
              src={state.url}
              className="flex-1 w-full border-0"
              title={doc.fileName}
            />
          ) : state.content ? (
            <div className="flex-1 overflow-y-auto px-5 py-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#e8e8ec] [&::-webkit-scrollbar-thumb]:rounded-full">
              <pre className="text-[13px] text-[#35353d] leading-[1.8] whitespace-pre-wrap font-sans">
                {state.content}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[12.5px] text-[#aaabb2]">暂无预览内容</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function DeleteDialog({
  doc,
  onConfirm,
  onCancel,
  deleting = false,
}: {
  doc: Doc
  onConfirm: () => void
  onCancel: () => void
  deleting?: boolean
}) {
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="bg-white border-[#ebebed] max-w-sm shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除文档</DialogTitle>
        </DialogHeader>
        <div className="py-1">
          <p className="text-[13px] text-[#62636b] leading-relaxed">
            确定要删除{" "}
            <span className="font-semibold text-[#0f0f10] font-mono">{doc.fileName}</span>{" "}
            吗？删除后该文档的向量索引将同步清除，此操作不可撤销。
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] hover:text-[#62636b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 px-4 rounded-[8px] bg-red-500 text-white text-[12.5px] font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? '删除中…' : '确认删除'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
