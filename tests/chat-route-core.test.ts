import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildChatHistory,
  classifyChatIntent,
  filterQualifiedChunks,
  heuristicChatRoute,
  mapChatSources,
} from '../src/lib/route-core/chat-route-core.ts'

test('classifyChatIntent 能区分普通对话与文档问题', () => {
  assert.equal(classifyChatIntent('你好'), 'conversational')
  assert.equal(classifyChatIntent('请总结这个文档的重点'), 'document')
})

test('heuristicChatRoute 在无命中或实时问题时走 kb_web', () => {
  assert.equal(heuristicChatRoute('介绍一下系统架构', false), 'kb_web')
  assert.equal(heuristicChatRoute('今天的政策有什么变化？', true), 'kb_web')
  assert.equal(heuristicChatRoute('请根据文档总结架构', true), 'kb_only')
})

test('buildChatHistory 会把摘要前置到历史消息中', () => {
  const history = buildChatHistory(
    [{ role: 'user', content: '最近我们聊了什么？' }],
    '用户之前在讨论知识库建设。'
  )

  assert.deepEqual(history, [
    { role: 'user', content: '[对话历史摘要]\n用户之前在讨论知识库建设。' },
    { role: 'assistant', content: '好的，我已了解之前的对话内容，请继续。' },
    { role: 'user', content: '最近我们聊了什么？' },
  ])
})

test('filterQualifiedChunks 与 mapChatSources 会过滤低分结果并截断内容', () => {
  const qualified = filterQualifiedChunks([
    {
      id: 'chunk-1',
      fileName: 'a.md',
      chunkIndex: 0,
      similarity: 0.8,
      content: 'A'.repeat(250),
    },
    {
      id: 'chunk-2',
      fileName: 'b.md',
      chunkIndex: 1,
      similarity: 0.2,
      content: 'B',
    },
  ])

  assert.equal(qualified.length, 1)

  const sources = mapChatSources(qualified, [
    {
      title: '网页',
      url: 'https://example.com',
      content: 'C'.repeat(260),
    },
  ])

  assert.deepEqual(sources, [
    {
      fileName: 'a.md',
      chunkIndex: 0,
      content: 'A'.repeat(200),
    },
    {
      fileName: '网页',
      chunkIndex: 0,
      content: 'C'.repeat(200),
      url: 'https://example.com',
    },
  ])
})
