import { prisma } from '../src/lib/prisma'
import { migrateLegacyUserApiKeysWithDeps } from '../src/lib/user-api-key-migration'

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
    await prisma.$disconnect()
  })
