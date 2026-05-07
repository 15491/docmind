"use client"

import { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Eye, FileText, Loader2, MessageSquare, RotateCw, Trash2, Upload } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DOC_TABLE_HEADERS } from "./constants"
import { DeleteDialog, StatusBadge } from "./components"
import { useDocList } from "./hooks"
import { useKbInfo } from "../../hooks"

export default function KBDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { kb } = useKbInfo(id)
  const kbName = kb?.name ?? "知识库"
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
      <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-[#f0f0f3]">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#aaabb2] hover:text-[#62636b] transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2} />
            控制台
          </Link>
          <span className="text-[#d8d8de]">/</span>
          <h1 className="text-[13.5px] font-semibold text-[#0f0f10]">{kbName}</h1>
        </div>
        <Link
          href={`/dashboard/kb/${id}/chat`}
          className="h-8 px-3.5 flex items-center gap-1.5 rounded-[8px] bg-zinc-900 text-white text-[12.5px] font-semibold hover:bg-zinc-700 transition-colors"
        >
          <MessageSquare size={12} strokeWidth={2} />
          开始问答
        </Link>
      </div>

      <div className="px-8 py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-[8px] bg-red-50 border border-red-200">
            <p className="text-[12px] text-red-700">{error}</p>
          </div>
        )}

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
          className={`border-[1.5px] border-dashed rounded-[12px] p-10 flex flex-col items-center gap-3 transition-all ${
            uploading
              ? "border-zinc-300 bg-zinc-50 cursor-not-allowed opacity-60"
              : dragging
                ? "border-zinc-400 bg-zinc-50 cursor-pointer"
                : "border-[#d8d8de] hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer"
          }`}
        >
          <div className="w-11 h-11 rounded-[10px] bg-zinc-100 flex items-center justify-center">
            {uploading
              ? <Loader2 size={18} strokeWidth={1.8} className="text-zinc-400 animate-spin" />
              : <Upload size={18} strokeWidth={1.8} className="text-zinc-400" />
            }
          </div>
          <div className="text-center">
            {uploading ? (
              <p className="text-[13.5px] text-[#aaabb2]">上传中，请稍候…</p>
            ) : (
              <>
                <p className="text-[13.5px] text-[#62636b]">
                  拖拽文件到此处，或
                  <span className="text-zinc-700 font-medium cursor-pointer hover:text-zinc-900 underline underline-offset-2">点击选择文件</span>
                </p>
                <p className="text-[12px] text-[#aaabb2] mt-1">支持 PDF / Markdown / TXT · 最大 50MB</p>
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
            <Loader2 size={16} strokeWidth={2} className="animate-spin mr-2" />
            <span className="text-[12.5px]">加载文档中…</span>
          </div>
        ) : null}

        {docs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-[#aaabb2] uppercase tracking-wider">
                文档列表 · {docs.length} 个
              </p>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBatchDeleteConfirm(true)}
                  disabled={batchDeleting}
                  className="h-8 px-3 flex items-center gap-1.5 rounded-[6px] bg-red-50 text-red-600 text-[12px] font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={12} strokeWidth={2} />
                  删除已选 ({selectedIds.size})
                </button>
              )}
            </div>
            <div className="rounded-[10px] border border-[#ebebed] overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#f0f0f3]">
                    <th className="px-4 py-2.5 text-center w-10">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={selectedIds.size > 0 && selectedIds.size === docs.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    {DOC_TABLE_HEADERS.map((header) => (
                      <th key={header} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#aaabb2] uppercase tracking-wider">
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
                        className={`group hover:bg-[#fafafa] transition-colors ${index < docs.length - 1 ? "border-b border-[#f5f5f7]" : ""}`}
                      >
                        <td className="px-4 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(doc.id)}
                            onChange={() => toggleSelect(doc.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {previewable ? (
                            <Link
                              href={previewHref}
                              className="flex items-center gap-2.5 text-left hover:text-zinc-900 transition-colors group/name"
                            >
                              <FileText size={14} strokeWidth={1.8} className="text-[#c0c0c8] flex-shrink-0" />
                              <span className="text-[13px] font-medium text-[#35353d] group-hover/name:text-zinc-900 group-hover/name:underline underline-offset-2 transition-colors">
                                {doc.fileName}
                              </span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2.5 text-left">
                              <FileText size={14} strokeWidth={1.8} className="text-[#c0c0c8] flex-shrink-0" />
                              <span className="text-[13px] font-medium text-[#35353d]">
                                {doc.fileName}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-[#aaabb2]">{(doc.fileSize / 1024).toFixed(1)}KB</td>
                        <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                        <td className="px-4 py-3 text-[12.5px] text-[#aaabb2]">{new Date(doc.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            {previewable && (
                              <Link
                                href={previewHref}
                                title="预览"
                                className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[#c0c0c8] hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                              >
                                <Eye size={13} strokeWidth={1.8} />
                              </Link>
                            )}
                            {doc.status === "failed" && (
                              <button
                                type="button"
                                title="重试"
                                onClick={() => void onRetry(doc.id)}
                                className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[#c0c0c8] hover:bg-amber-50 hover:text-amber-500 transition-colors"
                              >
                                <RotateCw size={13} strokeWidth={1.8} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="删除"
                              onClick={() => setDeleteDoc(doc)}
                              className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[#c0c0c8] hover:bg-red-50 hover:text-red-500 transition-colors"
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
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="h-8 px-4 rounded-[8px] border border-[#ebebed] text-[12px] font-medium text-[#62636b] hover:bg-zinc-50 hover:border-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? "加载中…" : "加载更多"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteDoc && (
        <DeleteDialog
          doc={deleteDoc}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteDoc(null)}
          deleting={deleting}
        />
      )}

      <Dialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <DialogContent className="bg-white border-[#ebebed] max-w-sm shadow-xl">
          <DialogHeader>
            <DialogDescription className="sr-only">
              Delete the selected documents and their related index data.
            </DialogDescription>
            <DialogTitle className="text-[14px] font-semibold text-[#0f0f10]">删除选中文档</DialogTitle>
          </DialogHeader>
          <div className="py-1">
            <p className="text-[13px] text-[#62636b] leading-relaxed">
              你即将删除 <span className="font-semibold text-[#0f0f10]">{selectedIds.size} 个</span> 文档，
              这会同时清除它们的向量索引，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowBatchDeleteConfirm(false)}
              className="h-8 px-3 text-[12.5px] font-medium text-[#aaabb2] hover:text-[#62636b] transition-colors"
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
              className="h-8 px-4 rounded-[8px] bg-red-500 text-white text-[12.5px] font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchDeleting ? "删除中…" : "确认删除"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
