import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // connect_timeout surfaces failures fast instead of hanging indefinitely.
  // NOTE: We intentionally do NOT set connection_limit=1 here because that
  // causes "$transaction" calls to fail with "Transaction not found / old
  // closed transaction" errors — a single pooled connection cannot hold a
  // transaction open across multiple sequential async queries.
  const dbUrl = process.env.DATABASE_URL
  const url = dbUrl?.includes('?')
    ? `${dbUrl}&connect_timeout=10`
    : `${dbUrl}?connect_timeout=10`

  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
