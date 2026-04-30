export const DOC_TABLE_HEADERS = ["文件名", "大小", "状态", "上传时间", ""]

import type { DocStatus } from "./types"

export const STATUS_MAP: Record<DocStatus, { label: string; cls: string; dot?: boolean }> = {
  ready:      { label: "就绪",   cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  processing: { label: "处理中", cls: "text-amber-700 bg-amber-50 border-amber-200", dot: true },
  failed:     { label: "失败",   cls: "text-red-600 bg-red-50 border-red-200" },
}
