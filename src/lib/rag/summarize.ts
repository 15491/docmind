interface MessageLike {
  role: string
  content: string
}

// 调用 GLM-4-Flash 将一段对话历史压缩为摘要
export async function summarizeMessages(
  messages: MessageLike[],
  apiKey?: string | null
): Promise<string> {
  const key = apiKey?.trim() || process.env.ZHIPU_API_KEY
  if (!key) throw new Error('Missing ZHIPU_API_KEY')

  const dialogue = messages
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n')

  const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        {
          role: 'system',
          content: '你是一个对话摘要助手。请将以下对话历史压缩为一段简洁的摘要，保留关键事实、结论和用户提到的重要信息，不要遗漏重要细节。摘要用第三人称描述，直接输出摘要内容，不需要额外解释。',
        },
        {
          role: 'user',
          content: `请总结以下对话：\n\n${dialogue}`,
        },
      ],
      stream: false,
      max_tokens: 512,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`Summarize API error: ${response.status}`)
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}
