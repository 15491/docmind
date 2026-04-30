export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Array<{ fileName: string; chunkIndex: number; content?: string }>
}
