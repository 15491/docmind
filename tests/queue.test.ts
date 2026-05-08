import assert from 'node:assert/strict'
import test from 'node:test'
import { getDocumentJobId } from '../src/lib/document-job-id.ts'

test('getDocumentJobId 统一文档任务 ID 格式', () => {
  assert.equal(getDocumentJobId('doc_123'), 'doc-doc_123')
})
