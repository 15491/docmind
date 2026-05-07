"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { STATUS_MAP } from "./constants"
import type { Doc, DocStatus } from "./types"

export function StatusBadge({ status }: { status: DocStatus }) {
  const { label, cls, dot } = STATUS_MAP[status]

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {dot ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> : null}
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
      <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Delete the selected document and its related index data.
          </DialogDescription>
          <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除文档</DialogTitle>
        </DialogHeader>
        <div className="py-1">
          <p className="text-[13px] leading-relaxed text-[#62636b]">
            确定要删除 <span className="font-semibold text-[#0f0f10]">“{doc.fileName}”</span> 吗？
            删除后该文档的向量索引也会同步清除，此操作不可撤销。
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 rounded-[8px] bg-red-500 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "删除中..." : "确认删除"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
