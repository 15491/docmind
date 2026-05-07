"use client"

import { useMemo } from "react"
import { marked } from "marked"

marked.use({
  gfm: true,
  breaks: true,
})

type MarkdownContentProps = {
  children: string
  className?: string
}

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  const html = useMemo(() => marked.parse(children) as string, [children])

  return (
    <div
      className={[
        "prose prose-sm max-w-none",
        "prose-headings:font-semibold prose-headings:text-[#0f0f10]",
        "prose-p:my-1.5 prose-p:leading-[1.75] prose-p:text-[#222225]",
        "prose-strong:font-semibold prose-strong:text-[#0f0f10]",
        "prose-code:rounded prose-code:bg-[#f0f0f3] prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:text-[#e55a3a] prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded-[8px] prose-pre:bg-[#f5f5f7] prose-pre:text-[#35353d]",
        "prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5",
        "prose-a:text-blue-600 prose-a:underline",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      ].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
