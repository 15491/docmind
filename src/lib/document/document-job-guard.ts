import {
  assertDocumentJobCanContinueWithDeps,
  DocumentJobAbortedError,
  getDocumentJobAbortReasonWithDeps,
  type ProcessableDocumentState,
} from './document-job-guard-core'
import { isDocumentCancellationRequested } from '@/lib/infra/queue'
import { prisma } from '@/lib/infra/prisma'

export {
  assertDocumentJobCanContinueWithDeps,
  DocumentJobAbortedError,
  getDocumentJobAbortReasonWithDeps,
  type ProcessableDocumentState,
} from './document-job-guard-core'

export async function getDocumentJobAbortReason(
  documentId: string,
  expectedStorageKey?: string
): Promise<string | null> {
  return getDocumentJobAbortReasonWithDeps(documentId, expectedStorageKey, {
    isCancelled: isDocumentCancellationRequested,
    loadDocument: (id) => prisma.document.findUnique({
      where: { id },
      select: { status: true, storageKey: true },
    }),
  })
}

export async function assertDocumentJobCanContinue(
  documentId: string,
  expectedStorageKey?: string
): Promise<void> {
  await assertDocumentJobCanContinueWithDeps(documentId, expectedStorageKey, {
    isCancelled: isDocumentCancellationRequested,
    loadDocument: (id) => prisma.document.findUnique({
      where: { id },
      select: { status: true, storageKey: true },
    }) as Promise<ProcessableDocumentState | null>,
  })
}

export function isDocumentJobAbortedError(error: unknown): error is DocumentJobAbortedError {
  return error instanceof DocumentJobAbortedError
}
