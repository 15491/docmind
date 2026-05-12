import Link from "next/link"
import { ArrowRight, Shield } from "lucide-react"
import { FEATURES, STEPS } from "./constants"
import { auth } from "@/lib/auth"

export default async function HomePage() {
  const session = await auth()
  const isLoggedIn = !!session?.user?.id

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <nav className="border-border bg-background flex h-14 shrink-0 items-center justify-between border-b px-8">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex h-[28px] w-[28px] items-center justify-center rounded-[7px] text-[12px] font-bold tracking-tight">
            D
          </div>
          <span className="text-foreground text-[14px] font-bold tracking-tight">DocMind</span>
        </div>
        {!isLoggedIn && (
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 items-center rounded-[8px] px-4 text-[13px] font-semibold transition-colors"
          >
            登录
          </Link>
        )}
      </nav>

      <section className="flex shrink-0 flex-col items-center px-6 pt-12 pb-8 text-center">
        <div className="border-border bg-muted text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold">
          <span className="bg-muted-foreground h-1.5 w-1.5 rounded-full" />
          基于 GLM-4-Flash · Elasticsearch · Next.js 16
        </div>

        <h1 className="text-foreground mb-4 max-w-2xl text-[48px] leading-[1.1] font-bold tracking-tight">
          上传文档，即刻获得
          <br />
          <span>精准 AI 问答</span>
        </h1>

        <p className="text-muted-foreground mb-7 max-w-md text-[15px] leading-relaxed">
          告别信息幻觉。所有回答来自你上传的文档，
          <br />
          每条答案精准标注来源段落，可追溯，可验证。
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 items-center gap-2 rounded-[10px] px-6 text-[14px] font-semibold transition-colors"
          >
            免费开始使用
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-8 px-8 pb-4">
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="border-border bg-card hover:border-foreground/30 hover:bg-accent/30 rounded-[12px] border p-5 transition-colors"
            >
              <div className="bg-muted mb-4 flex h-9 w-9 items-center justify-center rounded-[9px]">
                <Icon size={17} strokeWidth={1.8} className="text-foreground" />
              </div>
              <h3 className="text-foreground mb-1.5 text-[13.5px] font-semibold">{title}</h3>
              <p className="text-muted-foreground text-[12.5px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-muted-foreground mb-5 text-[11px] font-bold tracking-wider uppercase">三步上手</p>
          <div className="grid grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="flex gap-4">
                <span className="text-muted/80 flex-shrink-0 text-[32px] leading-none font-bold tabular-nums">
                  {num}
                </span>
                <div>
                  <h3 className="text-foreground mb-1.5 text-[13.5px] font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-[12.5px] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-border flex h-12 shrink-0 items-center justify-between border-t px-8">
        <div className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
          <Shield size={11} strokeWidth={2} />
          © 2026 DocMind
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-[12px]">
          <a href="https://github.com" className="hover:text-foreground transition-colors">
            GitHub
          </a>
          <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
        </div>
      </footer>
    </div>
  )
}
