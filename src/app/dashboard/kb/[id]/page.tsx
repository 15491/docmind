"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Eye, FileText, Loader2, RotateCw, Trash2, Upload } from "lucide-react"
import { PageContent } from "@/components/layout/page-content"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getStatusBadgeClass } from "@/lib/status-badge"
import { DeleteDialog, StatusBadge } from "./components"
import { DOC_TABLE_HEADERS } from "./constants"
import { useDocList } from "./hooks"
import { useKb } from "./kb-context"

export default function KBDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { refreshKb } = useKb()
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const {
    docs,
    dragging,
    setDragging,
    deleteDoc,
    setDeleteDoc,
    handleDelete,
    onRetry,
    fileInputRef,
    handleFileSelect,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    uploading,
    deleting,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    handleBatchDelete,
    batchDeleting,
  } = useDocList(id, refreshKb)

  useEffect(() => {
    if (!headerCheckboxRef.current) return
    headerCheckboxRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < docs.length
  }, [docs.length, selectedIds.size])

  return (
    <div className="h-full overflow-y-auto bg-background">
      <PageContent className="space-y-6">
        {error ? (
          <div className={`rounded-[8px] p-4 ${getStatusBadgeClass("error")}`}>
            <p className="text-[12px]">{error}</p>
          </div>
        ) : null}

        <div
          onDragOver={(event) => {
            if (uploading) return
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (!uploading) {
              void handleFileSelect(event.dataTransfer.files)
            }
          }}
          onClick={() => {
            if (!uploading) {
              fileInputRef.current?.click()
            }
          }}
          className={`flex flex-col items-center gap-3 rounded-[12px] border-[1.5px] border-dashed p-10 transition-all ${
            uploading
              ? "cursor-not-allowed border-input bg-muted opacity-60"
              : dragging
                ? "cursor-pointer border-foreground/30 bg-muted"
                : "cursor-pointer border-input hover:border-foreground/30 hover:bg-muted"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-muted">
            {uploading ? (
              <Loader2 size={18} strokeWidth={1.8} className="animate-spin text-muted-foreground" />
            ) : (
              <Upload size={18} strokeWidth={1.8} className="text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            {uploading ? (
              <p className="text-[13.5px] text-muted-foreground">上传中，请稍候...</p>
            ) : (
              <>
                <p className="text-[13.5px] text-muted-foreground">
                  拖拽文件到此处，或
                  <span className="cursor-pointer font-medium text-foreground underline underline-offset-2 hover:text-foreground">
                    点击选择文件
                  </span>
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">支持 PDF / Markdown / TXT · 最大 50MB</p>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.md,.txt"
          multiple
          className="hidden"
          onChange={(event) => void handleFileSelect(event.target.files)}
        />

        {loading && docs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={16} strokeWidth={2} className="mr-2 animate-spin" />
            <span className="text-[12.5px]">加载文档中...</span>
          </div>
        ) : null}

        {docs.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                文档列表 · {docs.length} 项
              </p>
              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={batchDeleting}
                  className="flex h-8 items-center gap-1.5 rounded-[6px] bg-destructive/10 px-3 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={12} strokeWidth={2} />
                  删除已选 ({selectedIds.size})
                </button>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[10px] border border-border shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="w-10 px-4 py-2.5 text-center">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === docs.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </th>
                    {DOC_TABLE_HEADERS.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, index) => {
                    const previewable = doc.status === "ready" || doc.status === "failed"
                    const previewHref = `/dashboard/kb/${id}/docs/${doc.id}`

                    return (
                      <tr
                        key={doc.id}
                        className={`group transition-colors hover:bg-muted ${
                          index < docs.length - 1 ? "border-b border-border" : ""
                        }`}
                      >
                        <td className="w-10 px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(doc.id)}
                            onChange={() => toggleSelect(doc.id)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {previewable ? (
                            <Link
                              href={previewHref}
                              className="group/name flex items-center gap-2.5 text-left transition-colors hover:text-foreground"
                            >
                              <FileText size={14} strokeWidth={1.8} className="flex-shrink-0 text-muted-foreground" />
                              <span className="text-[13px] font-medium text-foreground transition-colors group-hover/name:text-foreground group-hover/name:underline underline-offset-2">
                                {doc.fileName}
                              </span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2.5 text-left">
                              <FileText size={14} strokeWidth={1.8} className="flex-shrink-0 text-muted-foreground" />
                              <span className="text-[13px] font-medium text-foreground">{doc.fileName}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                          {(doc.fileSize / 1024).toFixed(1)}KB
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {previewable ? (
                              <Link
                                href={previewHref}
                                title="预览"
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <Eye size={13} strokeWidth={1.8} />
                              </Link>
                            ) : null}
                            {doc.status === "failed" ? (
                              <button
                                type="button"
                                title="重试"
                                onClick={() => void onRetry(doc.id)}
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <RotateCw size={13} strokeWidth={1.8} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              title="删除"
                              onClick={() => setDeleteDoc(doc)}
                              className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={13} strokeWidth={1.8} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {hasMore ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="h-8 rounded-[8px] border border-border px-4 text-[12px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? "加载中..." : "加载更多"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </PageContent>

      {deleteDoc ? (
        <DeleteDialog
          doc={deleteDoc}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteDoc(null)}
          deleting={deleting}
        />
      ) : null}

      <Dialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <DialogContent className="max-w-sm border-border bg-card shadow-md">
          <DialogHeader>
            <DialogDescription className="sr-only">
              Delete the selected documents and their related index data.
            </DialogDescription>
            <DialogTitle className="text-[14px] font-semibold text-foreground">删除选中文档</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              你即将删除 <span className="font-semibold text-foreground">{selectedIds.size} 项</span> 文档，
              这会同时清除它们的向量索引，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowBatchDeleteConfirm(false)}
              className="h-8 px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleBatchDelete()
                setShowBatchDeleteConfirm(false)
              }}
              disabled={batchDeleting}
              className="h-8 rounded-[8px] bg-destructive px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchDeleting ? "删除中..." : "确认删除"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
