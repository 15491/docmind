import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteDocumentById, retryDocumentById } from '../src/lib/document-route-core.ts'
import { handleUploadDocument } from '../src/lib/upload-route-core.ts'

test('handleUploadDocument succeeds and enqueues the document job', async () => {
  const calls: string[] = []
  const formData = new FormData()
  const file = new File(['hello world'], 'demo.md', { type: 'text/markdown' })
  formData.set('kbId', 'cmuploadaaaaaaaaaaaaaaaaaa')
  formData.set('file', file)

  const response = await handleUploadDocument(
    new Request('http://localhost/api/upload', { method: 'POST', body: formData }),
    'user-1',
    {
      rateLimit: async () => ({ ok: true }),
      findKnowledgeBase: async (kbId) => {
        assert.equal(kbId, 'cmuploadaaaaaaaaaaaaaaaaaa')
        return { userId: 'user-1' }
      },
      findExistingDocument: async (knowledgeBaseId, contentHash) => {
        assert.equal(knowledgeBaseId, 'cmuploadaaaaaaaaaaaaaaaaaa')
        assert.match(contentHash, /^[0-9a-f]{32}$/)
        return null
      },
      createDocument: async (input) => {
        calls.push(`create:${input.fileName}`)
        assert.equal(input.status, 'processing')
        return {
          id: 'doc-1',
          fileName: input.fileName,
          fileSize: input.fileSize,
          status: input.status,
          createdAt: new Date('2026-05-09T12:00:00Z'),
        }
      },
      uploadObject: async (objectKey, buffer, mimeType) => {
        calls.push(`upload:${objectKey}`)
        assert.equal(objectKey, 'documents/doc-1/demo.md')
        assert.equal(buffer.toString('utf8'), 'hello world')
        assert.equal(mimeType, 'text/markdown')
      },
      setDocumentStorageKey: async (documentId, storageKey) => {
        calls.push(`storage:${documentId}:${storageKey}`)
      },
      deleteObject: async (objectKey) => {
        calls.push(`delete-object:${objectKey}`)
      },
      deleteDocumentRecord: async (documentId) => {
        calls.push(`delete-record:${documentId}`)
      },
      updateDocumentStatus: async (documentId, status) => {
        calls.push(`status:${documentId}:${status}`)
      },
      enqueueDocumentJob: async (job) => {
        calls.push(`queue:${job.documentId}`)
        assert.deepEqual(job, {
          documentId: 'doc-1',
          knowledgeBaseId: 'cmuploadaaaaaaaaaaaaaaaaaa',
          userId: 'user-1',
          fileName: 'demo.md',
          mimeType: 'text/markdown',
          objectKey: 'documents/doc-1/demo.md',
        })
        return { id: 'job-1' }
      },
    }
  )

  assert.equal(response.status, 202)
  assert.deepEqual(calls, [
    'create:demo.md',
    'upload:documents/doc-1/demo.md',
    'storage:doc-1:documents/doc-1/demo.md',
    'queue:doc-1',
  ])

  const payload = await response.json()
  assert.equal(payload.ok, true)
  assert.equal(payload.data.document.id, 'doc-1')
  assert.equal(payload.data.document.status, 'processing')
})

test('handleUploadDocument returns conflict for processing duplicate documents', async () => {
  const formData = new FormData()
  formData.set('kbId', 'cmuploadaaaaaaaaaaaaaaaaaa')
  formData.set('file', new File(['hello'], 'demo.md', { type: 'text/markdown' }))

  const response = await handleUploadDocument(
    new Request('http://localhost/api/upload', { method: 'POST', body: formData }),
    'user-1',
    {
      rateLimit: async () => ({ ok: true }),
      findKnowledgeBase: async () => ({ userId: 'user-1' }),
      findExistingDocument: async () => ({ id: 'doc-existing', status: 'processing' }),
      createDocument: async () => {
        throw new Error('should not create document')
      },
      uploadObject: async () => {
        throw new Error('should not upload object')
      },
      setDocumentStorageKey: async () => {
        throw new Error('should not update storage key')
      },
      deleteObject: async () => {
        throw new Error('should not delete object')
      },
      deleteDocumentRecord: async () => {
        throw new Error('should not delete record')
      },
      updateDocumentStatus: async () => {
        throw new Error('should not update status')
      },
      enqueueDocumentJob: async () => {
        throw new Error('should not enqueue job')
      },
    }
  )

  assert.equal(response.status, 409)
  const payload = await response.json()
  assert.equal(payload.code, 'CONFLICT')
  assert.equal(payload.message, '文件正在处理中，请稍后')
})

test('handleUploadDocument rolls back to failed when enqueueing fails', async () => {
  const calls: string[] = []
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const formData = new FormData()
    formData.set('kbId', 'cmuploadaaaaaaaaaaaaaaaaaa')
    formData.set('file', new File(['hello world'], 'demo.md', { type: 'text/markdown' }))

    const response = await handleUploadDocument(
      new Request('http://localhost/api/upload', { method: 'POST', body: formData }),
      'user-1',
      {
        rateLimit: async () => ({ ok: true }),
        findKnowledgeBase: async () => ({ userId: 'user-1' }),
        findExistingDocument: async () => null,
        createDocument: async (input) => ({
          id: 'doc-1',
          fileName: input.fileName,
          fileSize: input.fileSize,
          status: input.status,
          createdAt: new Date('2026-05-09T12:00:00Z'),
        }),
        uploadObject: async (objectKey) => {
          calls.push(`upload:${objectKey}`)
        },
        setDocumentStorageKey: async (documentId, storageKey) => {
          calls.push(`storage:${documentId}:${storageKey}`)
        },
        deleteObject: async (objectKey) => {
          calls.push(`delete-object:${objectKey}`)
        },
        deleteDocumentRecord: async (documentId) => {
          calls.push(`delete-record:${documentId}`)
        },
        updateDocumentStatus: async (documentId, status) => {
          calls.push(`status:${documentId}:${status}`)
        },
        enqueueDocumentJob: async () => {
          throw new Error('queue failed')
        },
      }
    )

    assert.equal(response.status, 500)
    assert.deepEqual(calls, [
      'upload:documents/doc-1/demo.md',
      'storage:doc-1:documents/doc-1/demo.md',
      'status:doc-1:failed',
    ])
  } finally {
    console.error = originalConsoleError
  }
})

test('deleteDocumentById clears cancellation markers when cleanup fails', async () => {
  const calls: string[] = []
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const response = await deleteDocumentById('doc-1', 'user-1', {
      findDocument: async () => ({
        id: 'doc-1',
        storageKey: 'documents/doc-1/demo.md',
        knowledgeBase: { userId: 'user-1' },
      }),
      cancelDocumentProcessingJobs: async (documentIds) => {
        calls.push(`cancel:${documentIds.join(',')}`)
      },
      cleanupDocumentArtifacts: async () => {
        calls.push('cleanup')
        throw new Error('cleanup failed')
      },
      clearDocumentCancellationRequests: async (documentIds) => {
        calls.push(`clear:${documentIds.join(',')}`)
      },
      deleteDocument: async () => {
        calls.push('delete')
      },
    })

    assert.equal(response.status, 500)
    assert.deepEqual(calls, ['cancel:doc-1', 'cleanup', 'clear:doc-1'])
  } finally {
    console.error = originalConsoleError
  }
})

test('retryDocumentById requeues failed documents', async () => {
  const calls: string[] = []

  const response = await retryDocumentById('doc-9', 'user-1', {
    rateLimit: async () => ({ ok: true }),
    findDocument: async () => ({
      id: 'doc-9',
      fileName: 'retry.pdf',
      mimeType: 'application/pdf',
      status: 'failed',
      storageKey: 'documents/doc-9/retry.pdf',
      knowledgeBaseId: 'kb-9',
      knowledgeBase: { userId: 'user-1' },
    }),
    purgeDocumentDerivedData: async (documentId) => {
      calls.push(`purge:${documentId}`)
    },
    updateDocumentStatus: async (documentId, status) => {
      calls.push(`status:${documentId}:${status}`)
    },
    clearDocumentCancellationRequested: async (documentId) => {
      calls.push(`uncancel:${documentId}`)
    },
    enqueueDocumentJob: async (job) => {
      calls.push(`queue:${job.documentId}`)
      assert.deepEqual(job, {
        documentId: 'doc-9',
        knowledgeBaseId: 'kb-9',
        userId: 'user-1',
        fileName: 'retry.pdf',
        mimeType: 'application/pdf',
        objectKey: 'documents/doc-9/retry.pdf',
      })
    },
  })

  assert.equal(response.status, 200)
  assert.deepEqual(calls, [
    'purge:doc-9',
    'status:doc-9:processing',
    'uncancel:doc-9',
    'queue:doc-9',
  ])
})

test('retryDocumentById restores failed status when requeueing fails', async () => {
  const calls: string[] = []
  const originalConsoleError = console.error
  console.error = () => {}

  try {
    const response = await retryDocumentById('doc-9', 'user-1', {
      rateLimit: async () => ({ ok: true }),
      findDocument: async () => ({
        id: 'doc-9',
        fileName: 'retry.pdf',
        mimeType: 'application/pdf',
        status: 'failed',
        storageKey: 'documents/doc-9/retry.pdf',
        knowledgeBaseId: 'kb-9',
        knowledgeBase: { userId: 'user-1' },
      }),
      purgeDocumentDerivedData: async (documentId) => {
        calls.push(`purge:${documentId}`)
      },
      updateDocumentStatus: async (documentId, status) => {
        calls.push(`status:${documentId}:${status}`)
      },
      clearDocumentCancellationRequested: async (documentId) => {
        calls.push(`uncancel:${documentId}`)
      },
      enqueueDocumentJob: async () => {
        throw new Error('queue failed')
      },
    })

    assert.equal(response.status, 500)
    assert.deepEqual(calls, [
      'purge:doc-9',
      'status:doc-9:processing',
      'uncancel:doc-9',
      'status:doc-9:failed',
    ])
  } finally {
    console.error = originalConsoleError
  }
})
