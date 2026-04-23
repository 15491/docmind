export type DocStatus = "ready" | "processing" | "failed"

export type Doc = {
  id: string
  name: string
  size: string
  status: DocStatus
  uploadedAt: string
}
