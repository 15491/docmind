import { deleteDocumentChunks } from '@/lib/infra/elasticsearch'
import { deleteFile } from '@/lib/infra/minio'
import { prisma } from '@/lib/infra/prisma'

export interface DocumentArtifact {
  id: string
  storageKey: string | null
}

type CleanupTarget = 'search' | 'storage' | 'database'

type CleanupFailure = {
  documentId: string
  target: CleanupTarget
  reason: unknown
}

type CleanupStep = {
  documentId: string
  target: CleanupTarget
  run: () => Promise<unknown>
}

export class DocumentCleanupError extends Error {
  readonly failures: CleanupFailure[]

  constructor(failures: CleanupFailure[]) {
    super(`Document cleanup failed for ${failures.length} operation(s)`)
    this.name = 'DocumentCleanupError'
    this.failures = failures
  }
}

async function runCleanupSteps(steps: CleanupStep[]) {
  const results = await Promise.allSettled(steps.map((step) => step.run()))
  const failures = results.flatMap((result, index) => (
    result.status === 'rejected'
      ? [{
          documentId: steps[index]?.documentId ?? 'unknown',
          target: steps[index]?.target ?? 'storage',
          reason: result.reason,
        }]
      : []
  ))

  if (failures.length > 0) {
    throw new DocumentCleanupError(failures)
  }
}

export async function cleanupDocumentArtifactsWithClients(
  documents: DocumentArtifact[],
  clients: {
    deleteChunks: (documentId: string) => Promise<unknown>
    deleteObject: (objectKey: string) => Promise<unknown>
  }
) {
  const steps: CleanupStep[] = documents.flatMap((document) => {
    const documentSteps: CleanupStep[] = [{
      documentId: document.id,
      target: 'search',
      run: () => clients.deleteChunks(document.id),
    }]

    if (document.storageKey) {
      documentSteps.push({
        documentId: document.id,
        target: 'storage',
        run: () => clients.deleteObject(document.storageKey as string),
      })
    }

    return documentSteps
  })

  await runCleanupSteps(steps)
}

export async function cleanupDocumentArtifacts(documents: DocumentArtifact[]) {
  await cleanupDocumentArtifactsWithClients(documents, {
    deleteChunks: deleteDocumentChunks,
    deleteObject: deleteFile,
  })
}

export async function purgeDocumentDerivedDataWithClients(
  documentId: string,
  clients: {
    deleteChunks: (documentId: string) => Promise<unknown>
    deleteDatabaseChunks: (documentId: string) => Promise<unknown>
  }
) {
  await runCleanupSteps([
    {
      documentId,
      target: 'search',
      run: () => clients.deleteChunks(documentId),
    },
    {
      documentId,
      target: 'database',
      run: () => clients.deleteDatabaseChunks(documentId),
    },
  ])
}

export async function purgeDocumentDerivedData(documentId: string) {
  await purgeDocumentDerivedDataWithClients(documentId, {
    deleteChunks: deleteDocumentChunks,
    deleteDatabaseChunks: (id) => prisma.documentChunk.deleteMany({ where: { documentId: id } }),
  })
}
