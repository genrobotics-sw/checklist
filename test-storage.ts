import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const result: any = await prisma.$queryRaw`SELECT SUM(COALESCE((metadata->>'size')::bigint, 0)) as total_bytes FROM storage.objects WHERE bucket_id = 'checklist-photos';`
  console.log("Total bytes:", result[0].total_bytes)
}
main()
