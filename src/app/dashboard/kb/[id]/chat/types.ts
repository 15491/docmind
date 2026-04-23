export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: { name: string; chunk: number }[]
}
