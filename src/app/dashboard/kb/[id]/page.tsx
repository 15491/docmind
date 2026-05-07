"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Eye, FileText, Loader2, RotateCw, Trash2, Upload } from "lucide-react"
import { PageContent } from "@/components/layout/page-content"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DeleteDialog, StatusBadge } from "./components"
import { DOC_TABLE_HEADERS } from "./constants"
import { useDocList } from "./hooks"

export default function KBDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
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
  } = useDocList(id)

  useEffect(() => {
    if (!headerCheckboxRef.current) return
    headerCheckboxRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < docs.length
  }, [docs.length, selectedIds.size])

  return (
    <div className="h-full overflow-y-auto bg-white">
      <PageContent className="space-y-6">
        {error ? (
          <div className="rounded-[8px] border border-red-200 bg-red-50 p-4">
            <p className="text-[12px] text-red-700">{error}</p>
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
              ? "cursor-not-allowed border-zinc-300 bg-zinc-50 opacity-60"
              : dragging
                ? "cursor-pointer border-zinc-400 bg-zinc-50"
                : "cursor-pointer border-[#d8d8de] hover:border-zinc-400 hover:bg-zinc-50"
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-zinc-100">
            {uploading ? (
              <Loader2 size={18} strokeWidth={1.8} className="animate-spin text-zinc-400" />
            ) : (
              <Upload size={18} strokeWidth={1.8} className="text-zinc-400" />
            )}
          </div>
          <div className="text-center">
            {uploading ? (
              <p className="text-[13.5px] text-[#aaabb2]">上传中，请稍候...</p>
            ) : (
              <>
                <p className="text-[13.5px] text-[#62636b]">
                  拖拽文件到此处，或
                  <span className="cursor-pointer font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900">
                    点击选择文件
                  </span>
                </p>
                <p className="mt-1 text-[12px] text-[#aaabb2]">支持 PDF / Markdown / TXT · 最大 50MB</p>
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
          <div className="flex items-center justify-center py-16 text-[#aaabb2]">
            <Loader2 size={16} strokeWidth={2} className="mr-2 animate-spin" />
            <span className="text-[12.5px]">加载文档中...</span>
          </div>
        ) : null}

        {docs.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#aaabb2]">
                文档列表 · {docs.length} 项
              </p>
              {selectedIds.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={batchDeleting}
                  className="flex h-8 items-center gap-1.5 rounded-[6px] bg-red-50 px-3 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={12} strokeWidth={2} />
                  删除已选 ({selectedIds.size})
                </button>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[10px] border border-[#ebebed] shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#f0f0f3] bg-[#fafafa]">
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
                        className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#aaabb2]"
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
                        className={`group transition-colors hover:bg-[#fafafa] ${
                          index < docs.length - 1 ? "border-b border-[#f5f5f7]" : ""
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
                              className="group/name flex items-center gap-2.5 text-left transition-colors hover:text-zinc-900"
                            >
                              <FileText size={14} strokeWidth={1.8} className="flex-shrink-0 text-[#c0c0c8]" />
                              <span className="text-[13px] font-medium text-[#35353d] transition-colors group-hover/name:text-zinc-900 group-hover/name:underline underline-offset-2">
                                {doc.fileName}
                              </span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2.5 text-left">
                              <FileText size={14} strokeWidth={1.8} className="flex-shrink-0 text-[#c0c0c8]" />
                              <span className="text-[13px] font-medium text-[#35353d]">{doc.fileName}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-[#aaabb2]">
                          {(doc.fileSize / 1024).toFixed(1)}KB
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-[#aaabb2]">
                          {new Date(doc.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {previewable ? (
                              <Link
                                href={previewHref}
                                title="预览"
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                              >
                                <Eye size={13} strokeWidth={1.8} />
                              </Link>
                            ) : null}
                            {doc.status === "failed" ? (
                              <button
                                type="button"
                                title="重试"
                                onClick={() => void onRetry(doc.id)}
                                className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-amber-50 hover:text-amber-500"
                              >
                                <RotateCw size={13} strokeWidth={1.8} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              title="删除"
                              onClick={() => setDeleteDoc(doc)}
                              className="flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#c0c0c8] transition-colors hover:bg-red-50 hover:text-red-500"
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
                  className="h-8 rounded-[8px] border border-[#ebebed] px-4 text-[12px] font-medium text-[#62636b] transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        <DialogContent className="max-w-sm border-[#ebebed] bg-white shadow-xl">
          <DialogHeader>
            <DialogDescription className="sr-only">
              Delete the selected documents and their related index data.
            </DialogDescription>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除选中文档</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-[13px] leading-relaxed text-[#62636b]">
              你即将删除 <span className="font-semibold text-[#0f0f10]">{selectedIds.size} 项</span> 文档，
              这会同时清除它们的向量索引，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowBatchDeleteConfirm(false)}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] transition-colors hover:text-[#62636b]"
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
              className="h-8 rounded-[8px] bg-red-500 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchDeleting ? "删除中..." : "确认删除"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
