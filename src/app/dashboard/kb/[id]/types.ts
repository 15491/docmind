export type DocStatus = "ready" | "processing" | "failed"

export type Doc = {
  id: string
  fileName: string
  fileSize: number
  status: DocStatus
  chunkCount?: number
  createdAt: string | Date
}
