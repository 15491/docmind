import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { webSearch } from '@/lib/web-search'

export const webSearchSchema = z.object({
  query: z.string().describe('用于网络搜索的关键词或问题'),
})

export const webSearchTool = tool(
  async ({ query }: z.infer<typeof webSearchSchema>) => {
    const results = await webSearch(query)
    return results
      .map((result, index) => `[${index + 1}] ${result.title}（${result.url}）\n${result.content}`)
      .join('\n\n')
  },
  {
    name: 'web_search',
    description: '当知识库文档中没有足够信息，或需要实时最新数据时，调用此工具搜索互联网。',
    schema: webSearchSchema,
  }
)

export function parseWebSearchQuery(input: unknown): string {
  if (typeof input === 'string') return input
  if (input && typeof input === 'object' && 'query' in input) {
    const query = (input as { query?: unknown }).query
    return typeof query === 'string' ? query : ''
  }
  return ''
}
