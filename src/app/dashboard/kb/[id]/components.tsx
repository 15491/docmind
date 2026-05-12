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
  const { label, dotColor, pulse } = STATUS_MAP[status]

  return (
    <span className="border-border bg-background text-foreground inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${pulse ? "animate-pulse" : ""}`} />
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
      <DialogContent className="max-w-sm border-border bg-card shadow-md">
        <DialogHeader>
          <DialogDescription className="sr-only">
            Delete the selected document and its related index data.
          </DialogDescription>
          <DialogTitle className="text-[14px] font-semibold text-foreground">删除文档</DialogTitle>
        </DialogHeader>
        <div className="py-1">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            确定要删除 <span className="font-semibold text-foreground">“{doc.fileName}”</span> 吗？
            删除后该文档的向量索引也会同步清除，此操作不可撤销。
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-8 px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 rounded-[8px] bg-destructive px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "删除中..." : "确认删除"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
