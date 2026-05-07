"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
          <DialogDescription className="sr-only">
            Delete the selected document and its related index data.
          </DialogDescription>
          <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除文档</DialogTitle>
        </DialogHeader>
        <div className="py-1">
          <p className="text-[13px] text-[#62636b] leading-relaxed">
            确定要删除
            <span className="font-semibold text-[#0f0f10]">「{doc.fileName}」</span>
            吗？删除后该文档的向量索引也会同步清除，此操作不可撤销。
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
            {deleting ? "删除中…" : "确认删除"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
