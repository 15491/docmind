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
        "prose-headings:text-foreground prose-headings:font-semibold",
        "prose-p:text-foreground prose-p:my-1.5 prose-p:leading-[1.75]",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-code:bg-muted prose-code:text-foreground prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:text-foreground prose-pre:rounded-[8px]",
        "prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5",
        "prose-a:text-foreground prose-a:underline prose-a:underline-offset-2",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      ].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
