import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center px-8 h-14 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-[12px] font-bold tracking-tight bg-primary text-primary-foreground">
            D
          </div>
          <span className="text-[14px] font-bold text-foreground tracking-tight">DocMind</span>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
        <div className="w-14 h-14 rounded-[14px] bg-muted flex items-center justify-center">
          <FileQuestion size={22} strokeWidth={1.5} className="text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">404</p>
          <p className="text-[15px] font-semibold text-foreground mb-1.5">页面不存在</p>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            你访问的地址没有对应的页面
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="h-9 px-5 rounded-[9px] bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center"
          >
            去控制台
          </Link>
          <Link
            href="/"
            className="h-9 px-5 rounded-[9px] border border-border text-[13px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted transition-all flex items-center"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}
