"use client"

import { useSyncExternalStore } from "react"
import { X } from "lucide-react"

const STORAGE_KEY = "demo-banner-dismissed"
const DISMISS_EVENT = "demo-banner-change"

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback)
  return () => window.removeEventListener(DISMISS_EVENT, callback)
}

function isDismissedClient() {
  return sessionStorage.getItem(STORAGE_KEY) === "1"
}

function isDismissedServer() {
  return false
}

export function DemoBanner() {
  const dismissed = useSyncExternalStore(subscribe, isDismissedClient, isDismissedServer)

  if (dismissed) return null

  return (
    <div className="border-border bg-muted/40 text-muted-foreground flex h-7 flex-shrink-0 items-center justify-between border-b px-4 text-[11.5px]">
      <span>
        本站仅作为学习演示项目使用，<span className="text-foreground font-medium">请勿上传敏感或机密文档</span>。
      </span>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, "1")
          window.dispatchEvent(new Event(DISMISS_EVENT))
        }}
        title="关闭提示"
        className="hover:text-foreground flex h-5 w-5 items-center justify-center rounded-[4px] transition-colors"
      >
        <X size={12} strokeWidth={2} />
      </button>
    </div>
  )
}
