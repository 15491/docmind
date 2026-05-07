"use client"

import { createContext, useContext } from "react"
import type { Kb } from "@/app/dashboard/types"

type KbContextValue = {
  kb: Kb | null
  refreshKb: () => void
}

const defaultValue: KbContextValue = { kb: null, refreshKb: () => {} }

export const KbContext = createContext<KbContextValue>(defaultValue)

export function useKb() {
  return useContext(KbContext)
}
