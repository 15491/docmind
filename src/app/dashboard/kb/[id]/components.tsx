"use client"

import { X, FileText, ChevronRight, RotateCw, Eye, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Doc, DocStatus } from "./types"
import { STATUS_MAP, MOCK_PREVIEW } from "./constants"

export function StatusBadge({ status }: { status: DocStatus }) {
  const { label, cls, dot } = STATUS_MAP[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {label}
    </span>
  )
}

export function PreviewPanel({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const preview = MOCK_PREVIEW[doc.name]
  const ext = doc.name.split(".").pop()?.toLowerCase()

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[480px] bg-white z-50 flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.08)] border-l border-[#ebebed]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#ebebed] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-[7px] bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <FileText size={13} strokeWidth={1.8} className="text-zinc-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#0f0f10] truncate">{doc.name}</p>
              <p className="text-[11px] text-[#aaabb2]">{doc.size} · {doc.uploadedAt}上传</p>
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
          <span className="text-[11px] text-[#aaabb2]">技术文档知识库</span>
          <ChevronRight size={11} className="text-[#d8d8de]" />
          <span className="text-[11px] text-[#62636b] font-medium">{doc.name}</span>
          <span className="ml-auto">
            <StatusBadge status={doc.status} />
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#e8e8ec] [&::-webkit-scrollbar-thumb]:rounded-full">
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
          ) : preview ? (
            ext === "pdf" ? (
              <div className="bg-[#f7f7f8] rounded-[8px] p-4">
                <div className="bg-white rounded-[6px] p-6 shadow-sm">
                  <pre className="text-[13px] text-[#35353d] leading-[1.8] whitespace-pre-wrap font-sans">
                    {preview.content}
                  </pre>
                </div>
              </div>
            ) : ext === "md" ? (
              <div className="prose prose-sm max-w-none">
                <pre className="text-[13px] text-[#35353d] leading-[1.8] whitespace-pre-wrap font-sans bg-transparent p-0">
                  {preview.content}
                </pre>
              </div>
            ) : (
              <pre className="text-[13px] text-[#35353d] leading-[1.8] whitespace-pre-wrap font-sans">
                {preview.content}
              </pre>
            )
          ) : (
            <p className="text-[13px] text-[#aaabb2]">暂无预览内容</p>
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
}: {
  doc: Doc
  onConfirm: () => void
  onCancel: () => void
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
            <span className="font-semibold text-[#0f0f10] font-mono">{doc.name}</span>{" "}
            吗？删除后该文档的向量索引将同步清除，此操作不可撤销。
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] hover:text-[#62636b] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-8 px-4 rounded-[8px] bg-red-500 text-white text-[12.5px] font-semibold hover:bg-red-600 transition-colors"
          >
            确认删除
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
