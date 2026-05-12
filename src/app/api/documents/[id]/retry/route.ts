import { purgeDocumentDerivedData } from '@/lib/document/document-cleanup'
import { retryDocumentById } from '@/lib/document/document-route-core'
import { prisma } from '@/lib/infra/prisma'
import {
  clearDocumentCancellationRequested,
  enqueueDocumentJob,
} from '@/lib/infra/queue'
import { rateLimit } from '@/lib/http/rate-limit'
import { isValidationErrorResponse, validateRouteParams } from '@/lib/http/validate-request'
import { idParamSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

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
