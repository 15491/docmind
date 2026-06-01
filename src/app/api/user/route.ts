import { encryptUserApiKey, looksLikeMaskedApiKey, maskUserApiKey } from '@/lib/api-key/api-key-crypto'
import { cleanupDocumentArtifacts } from '@/lib/document/document-cleanup'
import { resolveStoredUserApiKey } from '@/lib/api-key/get-api-key'
import { prisma } from '@/lib/infra/prisma'
import {
  cancelDocumentProcessingJobs,
  clearDocumentCancellationRequests,
} from '@/lib/infra/queue'
import { Err, R } from '@/lib/http/response'
import { isValidationErrorResponse, parseJsonBody } from '@/lib/http/validate-request'
import { updateUserSchema } from '@/lib/http/validators'
import { withAuth } from '@/lib/http/with-auth'

export const GET = withAuth(async (_req, _ctx, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      accounts: { select: { providerId: true, password: true } },
      zhipuApiKey: true,
      ragConfig: true,
    },
  })
  if (!user) return Err.notFound('用户不存在')

  const apiKey = await resolveStoredUserApiKey(userId, user.zhipuApiKey)
  const credentialAccount = user.accounts.find((a) => a.providerId === 'credential')

  return R.ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      hasPassword: !!credentialAccount?.password,
      providers: user.accounts.map((a) => a.providerId).filter((p) => p !== 'credential'),
      hasZhipuApiKey: !!apiKey,
      zhipuApiKey: maskUserApiKey(apiKey),
      ragConfig: user.ragConfig ?? null,
    },
  })
})

export const PATCH = withAuth(async (req, _ctx, userId) => {
  const body = await parseJsonBody(req, updateUserSchema)
  if (isValidationErrorResponse(body)) return body

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.zhipuApiKey !== undefined && !looksLikeMaskedApiKey(body.zhipuApiKey)) {
    data.zhipuApiKey = body.zhipuApiKey ? encryptUserApiKey(body.zhipuApiKey) : null
  }
  if (body.ragConfig !== undefined) data.ragConfig = body.ragConfig

  if (Object.keys(data).length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
    if (!user) return Err.notFound('用户不存在')
    return R.ok({ user })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true },
  })

  return R.ok({ user })
})

export const DELETE = withAuth(async (_req, _ctx, userId) => {
  const documents = await prisma.document.findMany({
    where: { knowledgeBase: { userId } },
    select: { id: true, storageKey: true },
  })

  const documentIds = documents.map((document) => document.id)

  try {
    await cancelDocumentProcessingJobs(documentIds)
    await cleanupDocumentArtifacts(documents)
  } catch (error) {
    await clearDocumentCancellationRequests(documentIds).catch(() => {})
    throw error
  }

  await prisma.user.delete({ where: { id: userId } })
  return R.noData()
})
