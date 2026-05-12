import { Err, R } from '@/lib/http/response'

type RateLimitResult = {
  ok: boolean
}

type DocumentRecordForDelete = {
  id: string
  storageKey: string | null
  knowledgeBase: {
    userId: string
  }
}

type DocumentRecordForRetry = {
  id: string
  fileName: string
  mimeType: string
  status: string
  storageKey: string | null
  knowledgeBaseId: string
  knowledgeBase: {
    userId: string
  }
}

type DocumentJobPayload = {
  documentId: string
  knowledgeBaseId: string
  userId: string
  fileName: string
  mimeType: string
  objectKey: string
}

export interface DeleteDocumentDeps {
  findDocument: (documentId: string) => Promise<DocumentRecordForDelete | null>
  cancelDocumentProcessingJobs: (documentIds: string[]) => Promise<unknown>
  cleanupDocumentArtifacts: (documents: Array<{ id: string; storageKey: string | null }>) => Promise<unknown>
  clearDocumentCancellationRequests: (documentIds: string[]) => Promise<unknown>
  deleteDocument: (documentId: string) => Promise<unknown>
}

export interface RetryDocumentDeps {
  rateLimit: (key: string, maxRequests: number, windowSeconds: number) => Promise<RateLimitResult>
  findDocument: (documentId: string) => Promise<DocumentRecordForRetry | null>
  purgeDocumentDerivedData: (documentId: string) => Promise<unknown>
  updateDocumentStatus: (documentId: string, status: string) => Promise<unknown>
  clearDocumentCancellationRequested: (documentId: string) => Promise<unknown>
  enqueueDocumentJob: (job: DocumentJobPayload) => Promise<unknown>
}

export async function deleteDocumentById(
  documentId: string,
  userId: string,
  deps: DeleteDocumentDeps
): Promise<Response> {
  try {
    const document = await deps.findDocument(documentId)

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权删除该文档')

    const documentIds = [document.id]

    try {
      await deps.cancelDocumentProcessingJobs(documentIds)
      await deps.cleanupDocumentArtifacts([{ id: document.id, storageKey: document.storageKey }])
      await deps.deleteDocument(documentId)
    } catch (error) {
      await deps.clearDocumentCancellationRequests(documentIds).catch(() => {})
      throw error
    }

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]] DELETE Error:', error)
    return Err.internal('删除文档失败')
  }
}

export async function retryDocumentById(
  documentId: string,
  userId: string,
  deps: RetryDocumentDeps
): Promise<Response> {
  try {
    const { ok } = await deps.rateLimit(`rl:retry:${userId}`, 10, 60)
    if (!ok) return Err.tooMany('操作过于频繁，请稍后再试')

    const document = await deps.findDocument(documentId)

    if (!document) return Err.notFound('文档不存在')
    if (document.knowledgeBase.userId !== userId) return Err.forbidden('无权操作此文档')
    if (document.status !== 'failed') return Err.invalid('只有处理失败的文档才能重试')
    if (!document.storageKey) return Err.invalid('文档存储路径丢失，无法重试，请重新上传')

    await deps.purgeDocumentDerivedData(documentId)
    await deps.updateDocumentStatus(documentId, 'processing')

    try {
      await deps.clearDocumentCancellationRequested(documentId)
      await deps.enqueueDocumentJob({
        documentId,
        knowledgeBaseId: document.knowledgeBaseId,
        userId,
        fileName: document.fileName,
        mimeType: document.mimeType,
        objectKey: document.storageKey,
      })
    } catch (error) {
      await deps.updateDocumentStatus(documentId, 'failed').catch(() => {})
      throw error
    }

    return R.noData()
  } catch (error) {
    console.error('[/api/documents/[id]/retry] Error:', error)
    return Err.internal('重试失败')
  }
}
