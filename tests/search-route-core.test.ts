import assert from 'node:assert/strict'
import test from 'node:test'
import { handleSearchRequest } from '../src/lib/route-core/search-route-core.ts'

test('handleSearchRequest 使用用户默认 topK 并过滤未就绪文档', async () => {
  const req = new Request('http://localhost/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '  DocMind  ' }),
  })

  const response = await handleSearchRequest(req, 'user-1', {
    rateLimit: async () => ({ ok: true }),
    getUserContext: async () => ({
      apiKey: 'sk-test',
      ragConfig: { topK: 99 },
    }),
    embedText: async (text, apiKey) => {
      assert.equal(text, 'DocMind')
      assert.equal(apiKey, 'sk-test')
      return [0.1, 0.2]
    },
    searchChunks: async ({ embedding, userId, topK }) => {
      assert.deepEqual(embedding, [0.1, 0.2])
      assert.equal(userId, 'user-1')
      assert.equal(topK, 50)
      return [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          fileName: 'a.md',
          chunkIndex: 0,
          similarity: 1.2,
          content: 'alpha',
        },
        {
          id: 'chunk-2',
          documentId: 'doc-missing',
          fileName: 'missing.md',
          chunkIndex: 1,
          similarity: -1,
          content: 'beta',
        },
      ]
    },
    findReadyDocuments: async (documentIds) => {
      assert.deepEqual(documentIds, ['doc-1', 'doc-missing'])
      return [
        {
          id: 'doc-1',
          knowledgeBaseId: 'kb-1',
          knowledgeBase: { name: '知识库 A' },
        },
      ]
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.ok, true)
  assert.equal(payload.data.count, 1)
  assert.deepEqual(payload.data.results, [
    {
      id: 'chunk-1',
      docId: 'doc-1',
      docName: 'a.md',
      kbName: '知识库 A',
      kbId: 'kb-1',
      chunk: 0,
      score: 1,
      content: 'alpha',
    },
  ])
})

test('handleSearchRequest 超限时返回 429', async () => {
  const req = new Request('http://localhost/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'DocMind' }),
  })

  const response = await handleSearchRequest(req, 'user-1', {
    rateLimit: async () => ({ ok: false }),
    getUserContext: async () => {
      throw new Error('should not load user context')
    },
    embedText: async () => {
      throw new Error('should not embed')
    },
    searchChunks: async () => {
      throw new Error('should not search')
    },
    findReadyDocuments: async () => {
      throw new Error('should not load documents')
    },
  })

  assert.equal(response.status, 429)
  const payload = await response.json()
  assert.equal(payload.message, '搜索过于频繁，请稍后再试')
})
