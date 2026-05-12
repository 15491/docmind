"use client"

import { use, useEffect, useMemo, useState } from "react"
import { Download, ExternalLink, FileText, Loader2, TriangleAlert } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-content"
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
    <div className="bg-background flex h-full flex-col overflow-hidden">
      <section className="border-border flex-shrink-0 border-b px-8 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md">
              <FileText size={18} strokeWidth={1.8} className="text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-foreground truncate text-[16px] font-semibold">
                {doc?.fileName ?? "文档预览"}
              </h1>
              <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
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

          <div className="flex flex-shrink-0 items-center gap-2">
            {doc ? <StatusBadge status={doc.status} /> : null}
            {fileState.url ? (
              <>
                <a
                  href={fileState.url}
                  target="_blank"
                  rel="noreferrer"
                  className="border-input bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12.5px] font-medium transition-colors"
                >
                  <ExternalLink size={13} strokeWidth={2} />
                  新窗口打开
                </a>
                <a
                  href={doc ? getDownloadUrl(doc.id) : undefined}
                  download={doc?.fileName}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition-colors"
                >
                  <Download size={13} strokeWidth={2} />
                  下载
                </a>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <main className="min-h-0 flex-1 overflow-hidden">
        {docLoading ? (
          <StatePane>
            <Loader2 size={16} strokeWidth={2} className="text-muted-foreground animate-spin" />
            <span>加载文档信息中…</span>
          </StatePane>
        ) : docError ? (
          <StatePane tone="error">
            <TriangleAlert size={20} strokeWidth={2} className="text-destructive" />
            <span className="text-destructive">{docError}</span>
          </StatePane>
        ) : !doc ? (
          <StatePane>
            <span>未找到文档</span>
          </StatePane>
        ) : doc.status === "processing" ? (
          <StatePane>
            <Loader2 size={18} strokeWidth={2} className="text-muted-foreground animate-spin" />
            <span>文档仍在处理中，暂时无法预览。</span>
            <span className="text-muted-foreground/70 text-[12px]">处理完成后刷新页面即可查看。</span>
          </StatePane>
        ) : doc.status === "failed" ? (
          <StatePane tone="error">
            <TriangleAlert size={20} strokeWidth={2} className="text-destructive" />
            <span>文档解析失败，当前无法预览。</span>
          </StatePane>
        ) : fileState.loading ? (
          <StatePane>
            <Loader2 size={16} strokeWidth={2} className="text-muted-foreground animate-spin" />
            <span>加载预览内容中…</span>
          </StatePane>
        ) : fileState.error ? (
          <StatePane tone="error">
            <TriangleAlert size={20} strokeWidth={2} className="text-destructive" />
            <span className="text-destructive">{fileState.error}</span>
          </StatePane>
        ) : isPdf && fileState.url ? (
          <iframe
            src={fileState.url}
            title={doc.fileName}
            className="h-full w-full border-0"
          />
        ) : isMarkdown && fileState.content ? (
          <div className="h-full overflow-y-auto">
            <article className="mx-auto max-w-4xl px-8 py-8">
              <MarkdownContent>{fileState.content}</MarkdownContent>
            </article>
          </div>
        ) : fileState.content ? (
          <div className="h-full overflow-y-auto">
            <pre className="text-foreground mx-auto max-w-4xl px-8 py-8 font-sans text-[13px] leading-[1.9] whitespace-pre-wrap">
              {fileState.content}
            </pre>
          </div>
        ) : (
          <StatePane>
            <span>暂无可预览内容</span>
          </StatePane>
        )}
      </main>
    </div>
  )
}

function StatePane({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "error" }) {
  return (
    <div
      className={`text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-[13px] ${
        tone === "error" ? "" : ""
      }`}
    >
      {children}
    </div>
  )
}
