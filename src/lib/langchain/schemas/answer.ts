import { z } from 'zod'

export const answerSchema = z.object({
  answer: z.string().describe('面向用户的最终回答'),
  evidence: z.array(z.string()).default([]).describe('支撑回答的关键证据摘要'),
  confidence: z.enum(['high', 'medium', 'low']).describe('当前回答的置信度'),
  followUp: z.array(z.string()).default([]).describe('建议用户继续追问的问题'),
})

export type StructuredAnswer = z.infer<typeof answerSchema>
