"use client"

import { createContext, useContext } from "react"
import type { Kb } from "../types"

export const KbContext = createContext<Kb | null>(null)

export function useKb() {
  return useContext(KbContext)
}
