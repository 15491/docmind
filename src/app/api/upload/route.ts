import { deleteFile, uploadFile } from '@/lib/minio'
import { prisma } from '@/lib/prisma'
import { enqueueDocumentJob } from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'
import { handleUploadDocument } from '@/lib/upload-route-core'
import { withAuth } from '@/lib/with-auth'

const uploadRouteDeps = {
  rateLimit,
  findKnowledgeBase: (kbId: string) => prisma.knowledgeBase.findUnique({
    where: { id: kbId },
    select: { userId: true },
  }),
  findExistingDocument: (knowledgeBaseId: string, contentHash: string) => prisma.document.findFirst({
    where: { knowledgeBaseId, contentHash },
    select: { id: true, status: true },
  }),
  createDocument: (input: {
    fileName: string
    fileSize: number
    mimeType: string
    status: string
    contentHash: string
    knowledgeBaseId: string
  }) => prisma.document.create({ data: input }),
  uploadObject: uploadFile,
  setDocumentStorageKey: async (documentId: string, storageKey: string) => {
    await prisma.document.update({
      where: { id: documentId },
      data: { storageKey },
    })
  },
  deleteObject: deleteFile,
  deleteDocumentRecord: async (documentId: string) => {
    await prisma.document.delete({ where: { id: documentId } })
  },
  updateDocumentStatus: async (documentId: string, status: string) => {
    await prisma.document.update({
      where: { id: documentId },
      data: { status },
    })
  },
  enqueueDocumentJob,
}

export const POST = withAuth(async (req, _ctx, userId) => handleUploadDocument(req, userId, uploadRouteDeps))
