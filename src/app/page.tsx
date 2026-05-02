import Link from "next/link"
import { ArrowRight, Shield } from "lucide-react"
import { FEATURES, STEPS } from "./constants"
import { auth } from "@/lib/auth"

export default async function HomePage() {
  const session = await auth()
  const isLoggedIn = !!session?.user?.id

  return (
    <div className="h-screen bg-white text-[#0f0f10] flex flex-col overflow-hidden">
      <nav className="flex items-center justify-between px-8 h-14 border-b border-[#ebebed] bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center text-[12px] font-bold text-white tracking-tight"
            style={{ background: "#18181b", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
          >
            D
          </div>
          <span className="text-[14px] font-bold text-[#0f0f10] tracking-tight">DocMind</span>
        </div>
        {!isLoggedIn && (
          <Link href="/login" className="h-8 px-4 rounded-[8px] text-[13px] font-semibold text-white hover:bg-zinc-700 transition-colors flex items-center" style={{ background: "#18181b", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
            登录
          </Link>
        )}
      </nav>

      <section className="flex flex-col items-center text-center px-6 pt-12 pb-8 shrink-0">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11.5px] font-semibold mb-6 text-zinc-600"
          style={{ background: "rgba(0,0,0,0.04)", borderColor: "rgba(0,0,0,0.1)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          基于 GLM-4-Flash · Elasticsearch · Next.js 16
        </div>

        <h1 className="text-[48px] font-bold leading-[1.1] tracking-tight text-[#0f0f10] max-w-2xl mb-4">
          上传文档，即刻获得
          <br />
          <span className="text-zinc-900">精准 AI 问答</span>
        </h1>

        <p className="text-[15px] text-[#62636b] leading-relaxed max-w-md mb-7">
          告别信息幻觉。所有回答来自你上传的文档，
          <br />
          每条答案精准标注来源段落，可追溯，可验证。
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="h-11 px-6 rounded-[10px] text-[14px] font-semibold text-white flex items-center gap-2 hover:bg-zinc-700 transition-all"
            style={{ background: "#18181b", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
          >
            免费开始使用
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </section>

      <section className="flex-1 px-8 max-w-4xl mx-auto w-full flex flex-col justify-center gap-8 pb-4">
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="bg-white border border-[#ebebed] rounded-[12px] p-5 hover:border-zinc-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
            >
              <div className={`w-9 h-9 rounded-[9px] ${bg} flex items-center justify-center mb-4`}>
                <Icon size={17} strokeWidth={1.8} className={color} />
              </div>
              <h3 className="text-[13.5px] font-semibold text-[#0f0f10] mb-1.5">{title}</h3>
              <p className="text-[12.5px] text-[#62636b] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[11px] font-bold text-[#c0c0c8] uppercase tracking-wider mb-5">三步上手</p>
          <div className="grid grid-cols-3 gap-8">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="flex gap-4">
                <span className="text-[32px] font-bold text-[#ebebed] leading-none flex-shrink-0 tabular-nums">{num}</span>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-[#0f0f10] mb-1.5">{title}</h3>
                  <p className="text-[12.5px] text-[#62636b] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="shrink-0 border-t border-[#f0f0f3] px-8 h-12 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[12px] text-[#aaabb2]">
          <Shield size={11} strokeWidth={2} />
          © 2026 DocMind
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[#aaabb2]">
          <a href="https://github.com" className="hover:text-[#62636b] transition-colors">GitHub</a>
          <span className="hover:text-[#62636b] transition-colors cursor-pointer">Privacy Policy</span>
        </div>
      </footer>
    </div>
  )
}
