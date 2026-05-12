"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Settings, ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { GlobalSearch } from "./global-search"

const NAV_ITEMS = [
  { href: "/dashboard", icon: BookOpen, label: "知识库" },
]

const AUTO_COLLAPSE_WIDTH = 1100

export function IconNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const [showLogout, setShowLogout] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowLogout(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const check = () => {
      const narrow = window.innerWidth < AUTO_COLLAPSE_WIDTH

      if (narrow) {
        setCollapsed(true)
      } else if (userCollapsed !== true) {
        setCollapsed(false)
      }
    }

    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [userCollapsed])

  const handleCollapse = () => {
    setCollapsed(true)
    setUserCollapsed(true)
  }

  const handleExpand = () => {
    setCollapsed(false)
    setUserCollapsed(false)
  }

  const isNavActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/dashboard/kb")
      : pathname === href || pathname.startsWith(href + "/")

  const isSettingsActive = pathname.startsWith("/dashboard/settings")

  return (
    <nav
      className="border-border bg-background relative z-10 flex flex-shrink-0 flex-col border-r"
      style={{
        width: collapsed ? 52 : 220,
        transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        overflow: "visible",
      }}
    >
      <div
        className={`border-border flex h-[52px] flex-shrink-0 items-center overflow-hidden border-b ${
          collapsed ? "justify-center" : "gap-2 px-3"
        }`}
      >
        {collapsed ? (
          <>
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-[28px] w-[28px] items-center justify-center rounded-[7px] text-[12px] font-bold transition-colors"
            >
              D
            </Link>
            <button
              type="button"
              onClick={handleExpand}
              title="展开菜单"
              className="border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground absolute -right-[13px] top-[18px] z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-colors"
            >
              <ChevronRight size={11} strokeWidth={2.5} />
            </button>
          </>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-[7px] text-[12px] font-bold transition-colors"
            >
              D
            </Link>
            <span className="text-foreground flex-1 text-[14px] font-bold tracking-tight whitespace-nowrap">
              DocMind
            </span>
            <button
              type="button"
              onClick={handleCollapse}
              title="收起菜单"
              className="border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground absolute -right-[13px] top-[18px] z-20 flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-colors"
            >
              <ChevronLeft size={11} strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden px-2 py-2">
        {!collapsed && (
          <p className="text-muted-foreground px-2 pb-1.5 pt-1 text-[10px] font-bold tracking-[0.08em] whitespace-nowrap uppercase">
            菜单
          </p>
        )}

        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = isNavActive(href)

          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex h-[34px] items-center overflow-hidden rounded-[8px] whitespace-nowrap transition-colors ${
                collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
              } ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />
              <span
                className="text-[13px] font-medium"
                style={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto",
                  transition: "opacity 0.15s ease",
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}

        <GlobalSearch collapsed={collapsed} />
      </div>

      <div className="border-border space-y-0.5 border-t px-2 py-2">
        {!collapsed && (
          <p className="text-muted-foreground px-2 pb-1 pt-0.5 text-[10px] font-bold tracking-[0.08em] whitespace-nowrap uppercase">
            系统
          </p>
        )}

        <Link
          href="/dashboard/settings"
          title={collapsed ? "设置" : undefined}
          className={`flex h-[34px] items-center overflow-hidden rounded-[8px] whitespace-nowrap transition-colors ${
            collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
          } ${
            isSettingsActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Settings size={15} strokeWidth={isSettingsActive ? 2.2 : 1.8} className="flex-shrink-0" />
          <span
            className="text-[13px] font-medium"
            style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              transition: "opacity 0.15s ease",
            }}
          >
            设置
          </span>
        </Link>

        <div ref={userRef} className="relative">
          <button
            type="button"
            title={collapsed ? (session?.user?.name ?? "用户") : undefined}
            onClick={() => setShowLogout((visible) => !visible)}
            className={`hover:bg-muted flex h-[34px] w-full cursor-pointer items-center overflow-hidden rounded-[8px] whitespace-nowrap transition-colors ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
            }`}
          >
            <div className="bg-primary text-primary-foreground flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold">
              {(session?.user?.name ?? session?.user?.email ?? "U")[0].toUpperCase()}
            </div>
            <div
              className="flex min-w-0 flex-col"
              style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : "auto",
                transition: "opacity 0.15s ease",
              }}
            >
              <span className="text-foreground truncate text-[12.5px] font-semibold leading-tight">
                {session?.user?.name ?? session?.user?.email ?? "用户"}
              </span>
              <span className="text-muted-foreground truncate text-[10.5px] leading-tight">免费计划</span>
            </div>
          </button>
          {showLogout && (
            <div
              className={`border-border bg-popover absolute bottom-full z-50 mb-1.5 rounded-[10px] border py-1 shadow-md ${
                collapsed ? "left-0" : "left-0 right-0"
              }`}
            >
              <button
                type="button"
                onClick={() => signOut({ redirectTo: "/login" })}
                className="text-destructive hover:bg-destructive/10 flex h-[34px] w-full items-center gap-2.5 rounded-[8px] px-3 text-[13px] transition-colors"
              >
                <LogOut size={14} strokeWidth={2} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
