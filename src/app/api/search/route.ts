import { searchChunks } from '@/lib/infra/elasticsearch'
import { getUserContext } from '@/lib/api-key/get-api-key'
import { prisma } from '@/lib/infra/prisma'
import { rateLimit } from '@/lib/http/rate-limit'
import { embedText } from '@/lib/rag/embeddings'
import { handleSearchRequest } from '@/lib/route-core/search-route-core'
import { withAuth } from '@/lib/http/with-auth'

const searchRouteDeps = {
  rateLimit,
  getUserContext,
  embedText,
  searchChunks,
  findReadyDocuments: (documentIds: string[]) => prisma.document.findMany({
    where: { id: { in: documentIds }, status: 'ready' },
    select: {
      id: true,
      knowledgeBaseId: true,
      knowledgeBase: { select: { name: true } },
    },
  }),
}

export const POST = withAuth(async (req, _ctx, userId) => handleSearchRequest(req, userId, searchRouteDeps))
