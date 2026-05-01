export interface WebResult {
  title: string
  url: string
  content: string
}

// 调用 Tavily Search API，返回前 3 条相关结果
export async function webSearch(query: string): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    throw new Error('Missing TAVILY_API_KEY environment variable')
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 3,
      include_answer: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`)
  }

  const data = await response.json() as {
    results?: Array<{ title: string; url: string; content: string }>
  }

  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }))
}
