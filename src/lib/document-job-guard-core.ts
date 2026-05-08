export interface ProcessableDocumentState {
  status: string
  storageKey: string | null
}

export class DocumentJobAbortedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DocumentJobAbortedError'
  }
}

export async function getDocumentJobAbortReasonWithDeps(
  documentId: string,
  expectedStorageKey: string | undefined,
  deps: {
    isCancelled: (documentId: string) => Promise<boolean>
    loadDocument: (documentId: string) => Promise<ProcessableDocumentState | null>
  }
): Promise<string | null> {
  if (await deps.isCancelled(documentId)) {
    return 'Document job was cancelled'
  }

  const document = await deps.loadDocument(documentId)
  if (!document) {
    return 'Document no longer exists'
  }

  if (document.status !== 'processing') {
    return `Document status is ${document.status}`
  }

  if (expectedStorageKey !== undefined && document.storageKey !== expectedStorageKey) {
    return 'Document storage key changed'
  }

  return null
}

export async function assertDocumentJobCanContinueWithDeps(
  documentId: string,
  expectedStorageKey: string | undefined,
  deps: {
    isCancelled: (documentId: string) => Promise<boolean>
    loadDocument: (documentId: string) => Promise<ProcessableDocumentState | null>
  }
): Promise<void> {
  const reason = await getDocumentJobAbortReasonWithDeps(documentId, expectedStorageKey, deps)
  if (reason) {
    throw new DocumentJobAbortedError(reason)
  }
}
