"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, ExternalLink, FileText, Loader2, TriangleAlert } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { StatusBadge } from "../../components"
import type { Doc } from "../../types"
import { useKbInfo } from "../../../../hooks"
import { ApiError, http } from "@/lib/request"

type PreviewDocument = Doc & {
  knowledgeBaseId: string
}

type FileState = {
  loading: boolean
  url?: string
  content?: string
  error?: string
}

function formatFileSize(fileSize: number) {
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)}KB`
  }

  return `${(fileSize / 1024 / 1024).toFixed(2)}MB`
}

export default function DocumentPreviewPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = use(params)
  const { kb } = useKbInfo(id)
  const kbName = kb?.name ?? "知识库"

  const [doc, setDoc] = useState<PreviewDocument | null>(null)
  const [docLoading, setDocLoading] = useState(true)
  const [docError, setDocError] = useState<string | null>(null)
  const [fileState, setFileState] = useState<FileState>({ loading: false })

  const extension = useMemo(() => doc?.fileName.split(".").pop()?.toLowerCase() ?? "", [doc?.fileName])
  const isPdf = extension === "pdf"
  const isMarkdown = extension === "md"
  const isText = extension === "txt" || isMarkdown

  useEffect(() => {
    let cancelled = false

    const fetchDocument = async () => {
      try {
        setDocLoading(true)
        setDocError(null)
        const data = await http.get<{ document: PreviewDocument }>(`/api/documents/${docId}`)

        if (cancelled) return

        if (data.document.knowledgeBaseId !== id) {
          setDoc(null)
          setDocError("该文档不属于当前知识库")
          return
        }

        setDoc(data.document)
      } catch (err) {
        if (cancelled) return
        setDoc(null)
        setDocError(err instanceof ApiError ? err.message : "加载文档失败")
      } finally {
        if (!cancelled) {
          setDocLoading(false)
        }
      }
    }

    void fetchDocument()

    return () => {
      cancelled = true
    }
  }, [docId, id])

  useEffect(() => {
    let cancelled = false

    const fetchFile = async () => {
      if (!doc || doc.status !== "ready") {
        setFileState({ loading: false })
        return
      }

      try {
        setFileState({ loading: true })
        const { url } = await http.get<{ url: string }>(`/api/files/${doc.id}`)

        if (cancelled) return

        if (isText) {
          const response = await fetch(url)
          const content = await response.text()
          if (cancelled) return
          setFileState({ loading: false, url, content })
          return
        }

        setFileState({ loading: false, url })
      } catch (err) {
        if (cancelled) return
        setFileState({
          loading: false,
          error: err instanceof Error ? err.message : "加载预览失败，请稍后重试",
        })
      }
    }

    void fetchFile()

    return () => {
      cancelled = true
    }
  }, [doc, isText])

  return (
    <div className="h-full flex flex-col bg-[#f7f7f8] overflow-hidden">
      <header className="px-8 py-5 border-b border-[#ebebed] bg-white flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/dashboard/kb/${id}`}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#8a8b93] hover:text-[#35353d] transition-colors"
            >
              <ArrowLeft size={13} strokeWidth={2} />
              返回文档列表
            </Link>
            <div className="mt-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <FileText size={18} strokeWidth={1.8} className="text-zinc-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-[#aaabb2]">{kbName}</p>
                <h1 className="text-[18px] font-semibold text-[#0f0f10] truncate mt-0.5">
                  {doc?.fileName ?? "文档预览"}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8a8b93]">
                  {doc ? (
                    <>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>上传于 {new Date(doc.createdAt).toLocaleString("zh-CN")}</span>
                      <span>{doc.chunkCount ?? 0} 个分块</span>
                    </>
                  ) : (
                    <span>正在加载文档信息</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {doc ? <StatusBadge status={doc.status} /> : null}
            {fileState.url ? (
              <>
                <a
                  href={fileState.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3.5 rounded-[10px] border border-[#ebebed] bg-white text-[12.5px] font-medium text-[#62636b] hover:border-zinc-300 hover:text-[#0f0f10] transition-colors inline-flex items-center gap-1.5"
                >
                  <ExternalLink size={13} strokeWidth={2} />
                  新窗口打开
                </a>
                <a
                  href={fileState.url}
                  download={doc?.fileName}
                  className="h-9 px-3.5 rounded-[10px] bg-zinc-900 text-white text-[12.5px] font-medium hover:bg-zinc-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Download size={13} strokeWidth={2} />
                  下载
                </a>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className={`flex-1 min-h-0 ${isPdf && fileState.url ? "p-0" : "p-6"}`}>
        {docLoading ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white flex items-center justify-center text-[#8a8b93]">
            <Loader2 size={16} strokeWidth={2} className="animate-spin mr-2" />
            <span className="text-[13px]">加载文档信息中…</span>
          </div>
        ) : docError ? (
          <div className="h-full rounded-[20px] border border-red-200 bg-white flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <TriangleAlert size={20} strokeWidth={2} className="text-red-400" />
            </div>
            <p className="text-[13px] text-red-500">{docError}</p>
          </div>
        ) : !doc ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white flex items-center justify-center text-[#8a8b93]">
            <span className="text-[13px]">未找到文档</span>
          </div>
        ) : doc.status === "processing" ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white flex flex-col items-center justify-center gap-3">
            <Loader2 size={18} strokeWidth={2} className="animate-spin text-zinc-400" />
            <p className="text-[13px] text-[#62636b]">文档仍在处理中，暂时无法预览</p>
            <p className="text-[12px] text-[#aaabb2]">处理完成后刷新页面即可查看</p>
          </div>
        ) : doc.status === "failed" ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <TriangleAlert size={20} strokeWidth={2} className="text-red-400" />
            </div>
            <p className="text-[13px] text-[#62636b]">文档解析失败，当前无法预览</p>
          </div>
        ) : fileState.loading ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white flex items-center justify-center text-[#8a8b93]">
            <Loader2 size={16} strokeWidth={2} className="animate-spin mr-2" />
            <span className="text-[13px]">加载预览内容中…</span>
          </div>
        ) : fileState.error ? (
          <div className="h-full rounded-[20px] border border-red-200 bg-white flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <TriangleAlert size={20} strokeWidth={2} className="text-red-400" />
            </div>
            <p className="text-[13px] text-red-500">{fileState.error}</p>
          </div>
        ) : isPdf && fileState.url ? (
          <div className="h-full bg-white overflow-hidden">
            <iframe
              src={fileState.url}
              title={doc.fileName}
              className="w-full h-full border-0"
            />
          </div>
        ) : isMarkdown && fileState.content ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white shadow-sm overflow-y-auto">
            <article className="prose prose-sm max-w-4xl mx-auto px-8 py-8 text-[#222225] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileState.content}</ReactMarkdown>
            </article>
          </div>
        ) : fileState.content ? (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white shadow-sm overflow-y-auto">
            <pre className="max-w-4xl mx-auto px-8 py-8 text-[13px] text-[#35353d] leading-[1.9] whitespace-pre-wrap font-sans">
              {fileState.content}
            </pre>
          </div>
        ) : (
          <div className="h-full rounded-[20px] border border-[#ebebed] bg-white flex items-center justify-center text-[#8a8b93]">
            <span className="text-[13px]">暂无可预览内容</span>
          </div>
        )}
      </main>
    </div>
  )
}
