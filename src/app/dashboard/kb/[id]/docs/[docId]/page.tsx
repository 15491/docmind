"use client"

import { use, useEffect, useMemo, useState } from "react"
import { Download, ExternalLink, FileText, Loader2, TriangleAlert } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
import { PageContent } from "@/components/layout/page-content"
import { ApiError, http } from "@/lib/request"
import { StatusBadge } from "../../components"
import type { Doc } from "../../types"

type PreviewDocument = Doc & {
  knowledgeBaseId: string
}

type FileState = {
  loading: boolean
  url?: string
  content?: string
  error?: string
}

function getPreviewUrl(documentId: string) {
  return `/api/files/${documentId}`
}

function getDownloadUrl(documentId: string) {
  return `/api/files/${documentId}?download=1`
}

function formatFileSize(fileSize: number) {
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)}KB`
  }

  return `${(fileSize / 1024 / 1024).toFixed(2)}MB`
}

export default function DocumentPreviewPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = use(params)

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
          setDocError("该文档不属于当前知识库。")
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
        const url = getPreviewUrl(doc.id)

        if (isText) {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          const content = await response.text()
          if (cancelled) return
          setFileState({ loading: false, url, content })
          return
        }

        if (cancelled) return
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
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f7f8]">
      <PageContent className="flex min-h-0 flex-1 flex-col space-y-6">
        <section className="rounded-[16px] border border-[#ebebed] bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-zinc-100">
                  <FileText size={18} strokeWidth={1.8} className="text-zinc-500" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-[18px] font-semibold text-[#0f0f10]">
                    {doc?.fileName ?? "文档预览"}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8a8b93]">
                    {doc ? (
                      <>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>上传于 {new Date(doc.createdAt).toLocaleString("zh-CN")}</span>
                        <span>{doc.chunkCount ?? 0} 个分段</span>
                      </>
                    ) : (
                      <span>正在加载文档信息</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {doc ? <StatusBadge status={doc.status} /> : null}
              {fileState.url ? (
                <>
                  <a
                    href={fileState.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#ebebed] bg-white px-3.5 text-[12.5px] font-medium text-[#62636b] transition-colors hover:border-zinc-300 hover:text-[#0f0f10]"
                  >
                    <ExternalLink size={13} strokeWidth={2} />
                    新窗口打开
                  </a>
                  <a
                    href={doc ? getDownloadUrl(doc.id) : undefined}
                    download={doc?.fileName}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-zinc-900 px-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-zinc-700"
                  >
                    <Download size={13} strokeWidth={2} />
                    下载
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <main className="min-h-0 flex-1">
          {docLoading ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-[#ebebed] bg-white text-[#8a8b93]">
              <Loader2 size={16} strokeWidth={2} className="mr-2 animate-spin" />
              <span className="text-[13px]">加载文档信息中...</span>
            </div>
          ) : docError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[20px] border border-red-200 bg-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <TriangleAlert size={20} strokeWidth={2} className="text-red-400" />
              </div>
              <p className="text-[13px] text-red-500">{docError}</p>
            </div>
          ) : !doc ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-[#ebebed] bg-white text-[#8a8b93]">
              <span className="text-[13px]">未找到文档</span>
            </div>
          ) : doc.status === "processing" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[20px] border border-[#ebebed] bg-white">
              <Loader2 size={18} strokeWidth={2} className="animate-spin text-zinc-400" />
              <p className="text-[13px] text-[#62636b]">文档仍在处理中，暂时无法预览。</p>
              <p className="text-[12px] text-[#aaabb2]">处理完成后刷新页面即可查看。</p>
            </div>
          ) : doc.status === "failed" ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[20px] border border-[#ebebed] bg-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <TriangleAlert size={20} strokeWidth={2} className="text-red-400" />
              </div>
              <p className="text-[13px] text-[#62636b]">文档解析失败，当前无法预览。</p>
            </div>
          ) : fileState.loading ? (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-[#ebebed] bg-white text-[#8a8b93]">
              <Loader2 size={16} strokeWidth={2} className="mr-2 animate-spin" />
              <span className="text-[13px]">加载预览内容中...</span>
            </div>
          ) : fileState.error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[20px] border border-red-200 bg-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <TriangleAlert size={20} strokeWidth={2} className="text-red-400" />
              </div>
              <p className="text-[13px] text-red-500">{fileState.error}</p>
            </div>
          ) : isPdf && fileState.url ? (
            <div className="h-full overflow-hidden rounded-[20px] border border-[#ebebed] bg-white shadow-sm">
              <iframe
                src={fileState.url}
                title={doc.fileName}
                className="h-full w-full border-0"
              />
            </div>
          ) : isMarkdown && fileState.content ? (
            <div className="h-full overflow-y-auto rounded-[20px] border border-[#ebebed] bg-white shadow-sm">
              <article className="mx-auto max-w-4xl px-8 py-8">
                <MarkdownContent>{fileState.content}</MarkdownContent>
              </article>
            </div>
          ) : fileState.content ? (
            <div className="h-full overflow-y-auto rounded-[20px] border border-[#ebebed] bg-white shadow-sm">
              <pre className="mx-auto max-w-4xl whitespace-pre-wrap px-8 py-8 font-sans text-[13px] leading-[1.9] text-[#35353d]">
                {fileState.content}
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[20px] border border-[#ebebed] bg-white text-[#8a8b93]">
              <span className="text-[13px]">暂无可预览内容</span>
            </div>
          )}
        </main>
      </PageContent>
    </div>
  )
}
