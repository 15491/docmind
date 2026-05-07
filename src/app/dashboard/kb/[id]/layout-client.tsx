"use client"

import { usePathname } from "next/navigation"
import { useKbInfo } from "./hooks"
import { KbPageHeader } from "./header"
import { KbContext } from "./kb-context"

type KbLayoutClientProps = {
  kbId: string
  children: React.ReactNode
}

export default function KbLayoutClient({ kbId, children }: KbLayoutClientProps) {
  const pathname = usePathname()
  const { kb, refresh } = useKbInfo(kbId)

  return (
    <KbContext.Provider value={{ kb: kb ?? null, refreshKb: refresh }}>
      <KbPageHeader
        kbId={kbId}
        kbName={kb?.name ?? "知识库"}
        pathname={pathname}
        docCount={kb?.documentCount}
      />
      <div className="h-full min-h-0 bg-white">{children}</div>
    </KbContext.Provider>
  )
}
