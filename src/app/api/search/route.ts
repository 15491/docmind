import { searchChunks } from '@/lib/elasticsearch'
import { getUserContext } from '@/lib/get-api-key'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { embedText } from '@/lib/rag/embeddings'
import { handleSearchRequest } from '@/lib/search-route-core'
import { withAuth } from '@/lib/with-auth'

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
