import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deleteSessionById,
  getSessionMessagesById,
  listSessionsByKnowledgeBase,
} from '../src/lib/session-route-core.ts'

test('listSessionsByKnowledgeBase 返回分页结果并补默认标题', async () => {
  const response = await listSessionsByKnowledgeBase(
    new URLSearchParams({
      kbId: 'cmaaaaaaaaaaaaaaaaaaaaaaaa',
      limit: '1',
    }),
    'user-1',
    {
      findKnowledgeBase: async () => ({ userId: 'user-1' }),
      findSessions: async ({ kbId, cursor, limit }) => {
        assert.equal(kbId, 'cmaaaaaaaaaaaaaaaaaaaaaaaa')
        assert.equal(cursor, undefined)
        assert.equal(limit, 1)
        return [
          {
            id: 'session-1',
            title: null,
            createdAt: new Date('2026-05-09T12:00:00Z'),
            _count: { messages: 2 },
          },
          {
            id: 'session-2',
            title: '已有标题',
            createdAt: new Date('2026-05-09T13:00:00Z'),
            _count: { messages: 3 },
          },
        ]
      },
    }
  )

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.data.nextCursor, 'session-1')
  assert.deepEqual(payload.data.sessions, [
    {
      id: 'session-1',
      title: '新对话',
      messageCount: 2,
      createdAt: '2026-05-09T12:00:00.000Z',
    },
  ])
})

test('getSessionMessagesById 返回消息并补 sources 与 analysis 默认值', async () => {
  const response = await getSessionMessagesById('session-1', 'user-1', {
    findSession: async () => ({
      id: 'session-1',
      title: null,
      createdAt: new Date('2026-05-09T12:00:00Z'),
      knowledgeBase: { userId: 'user-1' },
    }),
    findMessages: async (sessionId) => {
      assert.equal(sessionId, 'session-1')
      return [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'hello',
          sources: null,
          analysis: null,
          createdAt: new Date('2026-05-09T12:05:00Z'),
        },
      ]
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.data.session.title, '新对话')
  assert.deepEqual(payload.data.messages, [
    {
      id: 'msg-1',
      role: 'assistant',
      content: 'hello',
      sources: [],
      analysis: null,
      createdAt: '2026-05-09T12:05:00.000Z',
    },
  ])
})

test('deleteSessionById 在无权限时返回 403', async () => {
  const response = await deleteSessionById('session-1', 'user-1', {
    findSession: async () => ({
      id: 'session-1',
      title: '标题',
      createdAt: new Date(),
      knowledgeBase: { userId: 'user-2' },
    }),
    deleteSession: async () => {
      throw new Error('should not delete session')
    },
  })

  assert.equal(response.status, 403)
  const payload = await response.json()
  assert.equal(payload.message, '无权删除此会话')
})
