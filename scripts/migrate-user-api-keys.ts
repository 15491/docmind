import { createRequire } from 'node:module'
import { migrateLegacyUserApiKeysWithDeps } from '../src/lib/user-api-key-migration'

const require = createRequire(import.meta.url)
// Resolve @next/env from Next itself so this one-off script stays aligned with the installed Next version.
const nextRequire = createRequire(require.resolve('next/package.json'))
const { loadEnvConfig } = nextRequire('@next/env') as {
  loadEnvConfig: (dir: string) => unknown
}

loadEnvConfig(process.cwd())

let prismaForCleanup: { $disconnect: () => Promise<unknown> } | null = null

function parseArgs(argv: string[]) {
  let dryRun = false
  let batchSize = 100

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg.startsWith('--batch-size=')) {
      const rawValue = arg.slice('--batch-size='.length)
      const parsedValue = Number.parseInt(rawValue, 10)
      if (!Number.isNaN(parsedValue) && parsedValue > 0) {
        batchSize = parsedValue
      }
    }
  }

  return { dryRun, batchSize }
}

async function main() {
  const { prisma } = await import('../src/lib/prisma')
  prismaForCleanup = prisma
  const { dryRun, batchSize } = parseArgs(process.argv.slice(2))

  console.log(
    `[user-api-key-migration] starting mode=${dryRun ? 'dry-run' : 'apply'} batchSize=${batchSize}`
  )

  const summary = await migrateLegacyUserApiKeysWithDeps(
    {
      listUsers: (cursor, take) => prisma.user.findMany({
        where: { zhipuApiKey: { not: null } },
        select: { id: true, zhipuApiKey: true },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      updateUserApiKey: (userId, encryptedApiKey) => prisma.user.update({
        where: { id: userId },
        data: { zhipuApiKey: encryptedApiKey },
      }),
    },
    { dryRun, batchSize }
  )

  console.log(
    `[user-api-key-migration] summary scanned=${summary.scanned} eligible=${summary.eligible} migrated=${summary.migrated} skipped=${summary.skipped} failed=${summary.failed}`
  )

  if (summary.failures.length > 0) {
    for (const failure of summary.failures) {
      console.error(`[user-api-key-migration] failed user=${failure.userId} reason=${failure.reason}`)
    }
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(
      '[user-api-key-migration] fatal:',
      error instanceof Error ? error.message : String(error)
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prismaForCleanup?.$disconnect()
  })
