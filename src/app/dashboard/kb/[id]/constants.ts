import type { DocStatus } from "./types"

export const DOC_TABLE_HEADERS = ["文件名", "大小", "状态", "上传时间", ""]

export const STATUS_MAP: Record<DocStatus, { label: string; dotColor: string; pulse?: boolean }> = {
  ready: {
    label: "就绪",
    dotColor: "bg-emerald-500 dark:bg-emerald-400",
  },
  processing: {
    label: "处理中",
    dotColor: "bg-amber-500 dark:bg-amber-400",
    pulse: true,
  },
  failed: {
    label: "失败",
    dotColor: "bg-red-500 dark:bg-red-400",
  },
}
