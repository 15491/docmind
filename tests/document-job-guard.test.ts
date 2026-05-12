import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertDocumentJobCanContinueWithDeps,
  DocumentJobAbortedError,
  getDocumentJobAbortReasonWithDeps,
} from '../src/lib/document/document-job-guard-core.ts'

test('getDocumentJobAbortReasonWithDeps 在任务被取消时返回原因', async () => {
  const reason = await getDocumentJobAbortReasonWithDeps('doc-1', 'key', {
    isCancelled: async () => true,
    loadDocument: async () => ({ status: 'processing', storageKey: 'key' }),
  })

  assert.equal(reason, 'Document job was cancelled')
})

test('assertDocumentJobCanContinueWithDeps 在对象键变化时抛出终止错误', async () => {
  await assert.rejects(
    () => assertDocumentJobCanContinueWithDeps('doc-1', 'key-a', {
      isCancelled: async () => false,
      loadDocument: async () => ({ status: 'processing', storageKey: 'key-b' }),
    }),
    (error: unknown) => {
      assert.equal(error instanceof DocumentJobAbortedError, true)
      assert.equal((error as Error).message, 'Document storage key changed')
      return true
    }
  )
})
