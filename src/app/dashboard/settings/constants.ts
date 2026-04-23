import type { ElementType } from "react"
import { User, Key, Sliders, Trash2 } from "lucide-react"
import type { Section } from "./types"

export const SECTIONS: { id: Section; label: string; icon: ElementType }[] = [
  { id: "profile", label: "账户信息", icon: User },
  { id: "api",     label: "API 配置",  icon: Key },
  { id: "rag",     label: "检索参数",  icon: Sliders },
  { id: "danger",  label: "危险操作",  icon: Trash2 },
]
