import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cleanupDocumentArtifactsWithClients,
  DocumentCleanupError,
  purgeDocumentDerivedDataWithClients,
} from '../src/lib/document/document-cleanup.ts'

test('cleanupDocumentArtifactsWithClients 会同时清理搜索索引与对象存储', async () => {
  const calls: string[] = []

  await cleanupDocumentArtifactsWithClients(
    [
      { id: 'doc-1', storageKey: 'documents/doc-1/a.pdf' },
      { id: 'doc-2', storageKey: null },
    ],
    {
      deleteChunks: async (documentId) => {
        calls.push(`es:${documentId}`)
      },
      deleteObject: async (objectKey) => {
        calls.push(`file:${objectKey}`)
      },
    }
  )

  assert.deepEqual(
    calls.sort(),
    [
      'es:doc-1',
      'file:documents/doc-1/a.pdf',
      'es:doc-2',
    ].sort()
  )
})

test('purgeDocumentDerivedDataWithClients 会聚合清理失败信息', async () => {
  await assert.rejects(
    () => purgeDocumentDerivedDataWithClients('doc-1', {
      deleteChunks: async () => {
        throw new Error('es failed')
      },
      deleteDatabaseChunks: async () => {
        throw new Error('db failed')
      },
    }),
    (error: unknown) => {
      assert.equal(error instanceof DocumentCleanupError, true)
      assert.equal((error as DocumentCleanupError).failures.length, 2)
      return true
    }
  )
})
