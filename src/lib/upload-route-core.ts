import { createHash } from 'node:crypto'
import { Err, R } from './response'
import { isValidationErrorResponse, validateFile, validateRequest } from './validate-request'
import { uploadFileSchema } from './validators'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]

type RateLimitResult = {
  ok: boolean
}

type UploadKnowledgeBase = {
  userId: string
}

type ExistingDocument = {
  id: string
  status: string
}

type CreatedDocument = {
  id: string
  fileName: string
  fileSize: number
  status: string
  createdAt: Date
}

type UploadDocumentJob = {
  documentId: string
  knowledgeBaseId: string
  userId: string
  fileName: string
  mimeType: string
  objectKey: string
}

type EnqueuedJob = {
  id?: string | null
}

export interface UploadRouteDeps {
  rateLimit: (key: string, maxRequests: number, windowSeconds: number) => Promise<RateLimitResult>
  findKnowledgeBase: (kbId: string) => Promise<UploadKnowledgeBase | null>
  findExistingDocument: (knowledgeBaseId: string, contentHash: string) => Promise<ExistingDocument | null>
  createDocument: (input: {
    fileName: string
    fileSize: number
    mimeType: string
    status: string
    contentHash: string
    knowledgeBaseId: string
  }) => Promise<CreatedDocument>
  uploadObject: (objectKey: string, buffer: Buffer, mimeType: string) => Promise<unknown>
  setDocumentStorageKey: (documentId: string, storageKey: string) => Promise<unknown>
  enqueueDocumentJob: (job: UploadDocumentJob) => Promise<EnqueuedJob>
}

export async function handleUploadDocument(
  req: Request,
  userId: string,
  deps: UploadRouteDeps
): Promise<Response> {
  try {
    const { ok } = await deps.rateLimit(`rl:upload:${userId}`, 10, 3600)
    if (!ok) return Err.tooMany('上传过于频繁，每小时最多 10 次')

    const formData = await req.formData()
    const rawFile = formData.get('file')
    const file = rawFile instanceof File ? rawFile : null
    const body = validateRequest({ kbId: formData.get('kbId') }, uploadFileSchema)
    if (isValidationErrorResponse(body)) return body

    const fileError = validateFile(file, { maxSize: MAX_FILE_SIZE, allowedTypes: ALLOWED_TYPES })
    if (fileError) return Err.invalid(fileError)

    if (!file) return Err.invalid('未提供文件')

    const kb = await deps.findKnowledgeBase(body.kbId)
    if (!kb) return Err.notFound('知识库不存在')
    if (kb.userId !== userId) return Err.forbidden('无权上传到此知识库')

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const contentHash = createHash('md5').update(fileBuffer).digest('hex')
    const existingDoc = await deps.findExistingDocument(body.kbId, contentHash)

    if (existingDoc) {
      if (existingDoc.status === 'ready') return Err.conflict(`文件已上传过，ID: ${existingDoc.id}`)
      if (existingDoc.status === 'failed') return Err.conflict(`文件之前上传失败，请重试该文档：${existingDoc.id}`)
      if (existingDoc.status === 'processing') return Err.conflict('文件正在处理中，请稍后')
    }

    const document = await deps.createDocument({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'processing',
      contentHash,
      knowledgeBaseId: body.kbId,
    })

    const objectKey = `documents/${document.id}/${file.name}`
    await deps.uploadObject(objectKey, fileBuffer, file.type)
    await deps.setDocumentStorageKey(document.id, objectKey)

    const job = await deps.enqueueDocumentJob({
      documentId: document.id,
      knowledgeBaseId: body.kbId,
      userId,
      fileName: file.name,
      mimeType: file.type,
      objectKey,
    })

    console.log(`[/api/upload] Document ${document.id} added to queue (job ${job.id ?? 'unknown'})`)
    return R.ok({
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
    }, 202)
  } catch (error) {
    console.error('[/api/upload] Error:', error)
    return Err.internal('文件上传失败')
  }
}
