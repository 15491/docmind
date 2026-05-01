export type DocStatus = "ready" | "processing" | "failed"

export type Doc = {
  id: string
  fileName: string
  fileSize: number
  status: DocStatus
  chunkCount?: number
  createdAt: string | Date
}

export type Kb = {
  id: string
  name: string
  documentCount: number
}
