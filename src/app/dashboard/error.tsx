"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlert } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="h-full bg-background flex flex-col items-center justify-center gap-5 px-8">
      <div className="w-14 h-14 rounded-[14px] bg-destructive/10 flex items-center justify-center">
        <TriangleAlert size={22} strokeWidth={1.5} className="text-destructive" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-foreground mb-1.5">出现了一些问题</p>
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-xs">
          {error.message || "页面加载时遇到了错误，请稍后再试"}
        </p>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground mt-2 font-mono">错误代码: {error.digest}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="h-9 px-5 rounded-[9px] bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors"
        >
          重试
        </button>
        <Link
          href="/dashboard"
          className="h-9 px-5 rounded-[9px] border border-border text-[13px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted transition-all flex items-center"
        >
          返回控制台
        </Link>
      </div>
    </div>
  )
}
