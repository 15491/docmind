"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Upload, Trash2, RotateCw, MessageSquare, FileText, Eye } from "lucide-react"
import { DOC_TABLE_HEADERS } from "./constants"
import { StatusBadge, PreviewPanel, DeleteDialog } from "./components"
import { useDocList } from "./hooks"

export default function KBDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { docs, dragging, setDragging, previewDoc, setPreviewDoc, deleteDoc, setDeleteDoc, handleDelete } = useDocList()

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
          <h1 className="text-[13.5px] font-semibold text-[#0f0f10]">技术文档知识库</h1>
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
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false) }}
          className={`border-[1.5px] border-dashed rounded-[12px] p-10 flex flex-col items-center gap-3 transition-all cursor-pointer ${
            dragging ? "border-zinc-400 bg-zinc-50" : "border-[#d8d8de] hover:border-zinc-400 hover:bg-zinc-50"
          }`}
        >
          <div className="w-11 h-11 rounded-[10px] bg-zinc-100 flex items-center justify-center">
            <Upload size={18} strokeWidth={1.8} className="text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-[13.5px] text-[#62636b]">
              拖拽文件到此处，或
              <span className="text-zinc-700 font-medium cursor-pointer hover:text-zinc-900 underline underline-offset-2">点击选择文件</span>
            </p>
            <p className="text-[12px] text-[#aaabb2] mt-1">支持 PDF / Markdown / TXT · 最大 10MB</p>
          </div>
        </div>

        {docs.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[#aaabb2] uppercase tracking-wider mb-3">
              文档列表 · {docs.length} 个
            </p>
            <div className="rounded-[10px] border border-[#ebebed] overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#f0f0f3]">
                    {DOC_TABLE_HEADERS.map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#aaabb2] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => (
                    <tr
                      key={doc.id}
                      className={`group hover:bg-[#fafafa] transition-colors ${
                        previewDoc?.id === doc.id ? "bg-zinc-50" : ""
                      } ${i < docs.length - 1 ? "border-b border-[#f5f5f7]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc.status === "ready" || doc.status === "failed" ? doc : null)}
                          className="flex items-center gap-2.5 text-left hover:text-zinc-900 transition-colors group/name"
                        >
                          <FileText size={14} strokeWidth={1.8} className="text-[#c0c0c8] flex-shrink-0" />
                          <span className="text-[13px] font-medium text-[#35353d] group-hover/name:text-zinc-900 group-hover/name:underline underline-offset-2 transition-colors">
                            {doc.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-[#aaabb2]">{doc.size}</td>
                      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                      <td className="px-4 py-3 text-[12.5px] text-[#aaabb2]">{doc.uploadedAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          {doc.status !== "processing" && (
                            <button
                              type="button"
                              title="预览"
                              onClick={() => setPreviewDoc(previewDoc?.id === doc.id ? null : doc)}
                              className={`w-[26px] h-[26px] rounded-[6px] flex items-center justify-center transition-colors ${
                                previewDoc?.id === doc.id
                                  ? "bg-zinc-900 text-white"
                                  : "text-[#c0c0c8] hover:bg-zinc-100 hover:text-zinc-600"
                              }`}
                            >
                              <Eye size={13} strokeWidth={1.8} />
                            </button>
                          )}
                          {doc.status === "failed" && (
                            <button
                              type="button"
                              title="重试"
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {previewDoc && (
        <PreviewPanel doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {deleteDoc && (
        <DeleteDialog
          doc={deleteDoc}
          onConfirm={handleDelete}
          onCancel={() => setDeleteDoc(null)}
        />
      )}
    </div>
  )
}
