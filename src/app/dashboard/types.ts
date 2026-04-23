export type Kb = {
  id: string
  name: string
  docCount: number
  updatedAt: string
}

export type RecentSession = {
  id: string
  kbId: string
  kbName: string
  title: string
  time: string
}
