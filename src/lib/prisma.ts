import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // connection_limit=1 prevents pool exhaustion in Next.js serverless/SSR renders
  // connect_timeout surfaces failures fast instead of hanging indefinitely
  const dbUrl = process.env.DATABASE_URL
  const url = dbUrl?.includes('?')
    ? `${dbUrl}&connection_limit=1&connect_timeout=10`
    : `${dbUrl}?connection_limit=1&connect_timeout=10`

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
