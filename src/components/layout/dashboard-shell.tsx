"use client"

import { createContext, useContext, useState } from "react"
import { createPortal } from "react-dom"
import { DemoBanner } from "./demo-banner"
import { IconNav } from "./icon-nav"
import { PageHeader, type PageHeaderProps } from "./page-header"

const DashboardHeaderContext = createContext<HTMLDivElement | null>(null)

type DashboardShellProps = {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [headerNode, setHeaderNode] = useState<HTMLDivElement | null>(null)

  return (
    <DashboardHeaderContext.Provider value={headerNode}>
      <div className="flex h-screen overflow-hidden bg-white">
        <IconNav />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          <DemoBanner />
          <div ref={setHeaderNode} className="min-h-[52px] flex-shrink-0 bg-white" />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </DashboardHeaderContext.Provider>
  )
}

export function DashboardPageHeader(props: PageHeaderProps) {
  const headerNode = useContext(DashboardHeaderContext)

  if (!headerNode) {
    return null
  }

  return createPortal(<PageHeader {...props} />, headerNode)
}
