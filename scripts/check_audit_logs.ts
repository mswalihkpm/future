import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: 'Student' },
        { action: { contains: 'PHOTO' } },
        { previousValue: { contains: 'photo' } },
        { newValue: { contains: 'photo' } },
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  console.log(`Matching AuditLogs found: ${auditLogs.length}`);
  auditLogs.slice(0, 10).forEach(l => {
    console.log(`- ${l.createdAt.toISOString()} | Action: ${l.action} | Entity: ${l.entity} | User: ${l.userName}`);
    console.log(`  Prev: ${l.previousValue?.slice(0, 100)}`);
    console.log(`  New:  ${l.newValue?.slice(0, 100)}`);
  });
}
main().finally(() => prisma.$disconnect());
