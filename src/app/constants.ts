import type { ElementType } from "react"
import { FileText, Search, BookMarked } from "lucide-react"

export const FEATURES: { icon: ElementType; title: string; desc: string; color: string; bg: string }[] = [
  {
    icon: FileText,
    title: "多格式支持",
    desc: "PDF / Markdown / TXT 自动解析入库，系统处理文档分块与向量化",
    color: "text-zinc-600",
    bg: "bg-zinc-100",
  },
  {
    icon: Search,
    title: "语义检索",
    desc: "余弦相似度向量检索，Top-K 精选最相关段落作为上下文",
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    icon: BookMarked,
    title: "引用溯源",
    desc: "每条 AI 回答精准标注来源文档与段落序号，杜绝大模型幻觉",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
]

export const STEPS = [
  { num: "01", title: "上传文档",   desc: "支持 PDF、Markdown、TXT，拖拽即可上传，系统自动解析向量化" },
  { num: "02", title: "建立知识库", desc: "按项目分组管理文档，不同知识库内容互相隔离" },
  { num: "03", title: "精准问答",   desc: "获得带来源标注的精准 AI 回答，每条引用均可追溯" },
]
