export type MessageAnalysis = {
  answer: string
  evidence: string[]
  confidence: "high" | "medium" | "low"
  followUp: string[]
}

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Array<{ fileName: string; chunkIndex: number; content?: string }>
  analysis?: MessageAnalysis
}
