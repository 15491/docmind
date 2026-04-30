// 文本分块工具：固定 token 数 + 滑窗重叠

export interface TextChunk {
  text: string
  startIndex: number
  endIndex: number
}

export function chunkText(
  text: string,
  maxTokens: number = 500,
  overlapTokens: number = 50
): TextChunk[] {
  // 简单估算：英文 ~4 chars per token，中文 ~1 char per token，混合取 2.5
  const avgCharsPerToken = 2.5
  const maxChars = Math.ceil(maxTokens * avgCharsPerToken)
  const overlapChars = Math.ceil(overlapTokens * avgCharsPerToken)

  if (text.length <= maxChars) {
    return [
      {
        text,
        startIndex: 0,
        endIndex: text.length,
      },
    ]
  }

  const chunks: TextChunk[] = []
  let startIndex = 0

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + maxChars, text.length)

    // 尝试在句号、句号、换行符处切割，保证完整性
    let actualEndIndex = endIndex
    if (endIndex < text.length) {
      // 向后查找最近的标点或换行
      const searchEnd = Math.max(startIndex + maxChars - 100, startIndex)
      for (let i = endIndex; i >= searchEnd; i--) {
        if (/[。．\n]/.test(text[i])) {
          actualEndIndex = i + 1
          break
        }
      }
      // 如果找不到标点，退而求其次找空格
      if (actualEndIndex === endIndex) {
        for (let i = endIndex; i >= searchEnd; i--) {
          if (/\s/.test(text[i])) {
            actualEndIndex = i
            break
          }
        }
      }
    }

    chunks.push({
      text: text.slice(startIndex, actualEndIndex),
      startIndex,
      endIndex: actualEndIndex,
    })

    // 滑窗重叠
    startIndex = actualEndIndex - overlapChars
    if (startIndex <= chunks[chunks.length - 2]?.endIndex ?? 0) {
      startIndex = actualEndIndex
    }
  }

  return chunks
}
