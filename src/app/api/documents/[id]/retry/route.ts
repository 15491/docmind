import { purgeDocumentDerivedData } from '@/lib/document-cleanup'
import { retryDocumentById } from '@/lib/document-route-core'
import { prisma } from '@/lib/prisma'
import {
  clearDocumentCancellationRequested,
  enqueueDocumentJob,
} from '@/lib/queue'
import { rateLimit } from '@/lib/rate-limit'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/validate-request'
import { idParamSchema } from '@/lib/validators'
import { withAuth } from '@/lib/with-auth'

export const POST = withAuth(async (_req, ctx, userId) => {
  const params = await validateRouteParams(ctx.params, idParamSchema)
  if (isValidationErrorResponse(params)) return params

  return retryDocumentById(params.id, userId, {
    rateLimit,
    findDocument: (documentId: string) => prisma.document.findUnique({
      where: { id: documentId },
      include: { knowledgeBase: true },
    }),
    purgeDocumentDerivedData,
    updateDocumentStatus: async (documentId: string, status: string) => {
      await prisma.document.update({
        where: { id: documentId },
        data: { status },
      })
    },
    clearDocumentCancellationRequested,
    enqueueDocumentJob,
  })
})
