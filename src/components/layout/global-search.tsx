"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { SearchWorkspace } from "@/components/search/search-workspace"

type GlobalSearchProps = {
  collapsed: boolean
}

export function GlobalSearch({ collapsed }: GlobalSearchProps) {
  const pathname = usePathname()
  const [openPathname, setOpenPathname] = useState<string | null>(null)

  const open = openPathname === pathname
  const setOpen = useCallback((nextOpen: boolean | ((currentOpen: boolean) => boolean)) => {
    setOpenPathname((currentPathname) => {
      const currentOpen = currentPathname === pathname
      const resolvedOpen = typeof nextOpen === "function" ? nextOpen(currentOpen) : nextOpen
      return resolvedOpen ? pathname : null
    })
  }, [pathname])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((visible) => !visible)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setOpen])

  return (
    <>
      <button
        type="button"
        title={collapsed ? "搜索" : undefined}
        onClick={() => setOpen(true)}
        className={`w-full flex h-[34px] items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
          collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
        }`}
      >
        <Search size={15} strokeWidth={1.8} className="flex-shrink-0" />
        <span
          className="text-[13px] font-medium"
          style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : "auto",
            transition: "opacity 0.15s ease",
          }}
        >
          搜索
        </span>
        {!collapsed && (
          <span className="ml-auto rounded-[7px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Ctrl K
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-4xl overflow-hidden border-border bg-card p-0 shadow-md"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">全局搜索</DialogTitle>
          <DialogDescription className="sr-only">
            在所有知识库中搜索相关文档片段，并优先打开命中文档。
          </DialogDescription>
          <SearchWorkspace variant="dialog" autoFocus onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
