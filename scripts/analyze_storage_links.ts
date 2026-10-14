import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const objects: any = await prisma.$queryRawUnsafe(`
    SELECT id, bucket_id, name, created_at, metadata
    FROM storage.objects
    ORDER BY created_at ASC;
  `);

  console.log(`Total storage objects: ${objects.length}`);

  const byBucket: Record<string, number> = {};
  const byPrefix: Record<string, number> = {};
  const byDate: Record<string, number> = {};

  objects.forEach((o: any) => {
    byBucket[o.bucket_id] = (byBucket[o.bucket_id] || 0) + 1;
    const prefix = o.name.split('/')[0];
    byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
    const dateStr = new Date(o.created_at).toISOString().slice(0, 10);
    byDate[dateStr] = (byDate[dateStr] || 0) + 1;
  });

  console.log('By Bucket:', byBucket);
  console.log('By Prefix (folder):', byPrefix);
  console.log('By Date:', byDate);

  // Check which students' photoUrls match which objects
  const students = await prisma.student.findMany({
    where: { photoUrl: { not: null } },
    select: { id: true, studentId: true, sprStudentId: true, fullName: true, photoUrl: true }
  });

  const studentObjectMap = new Map<string, string>();
  students.forEach(s => {
    if (s.photoUrl) {
      const match = s.photoUrl.match(/student-photos\/(.+)$/);
      if (match) {
        studentObjectMap.set(match[1], `${s.fullName} (${s.sprStudentId || s.studentId})`);
      }
    }
  });

  console.log(`\nObjects directly linked to a current student: ${studentObjectMap.size}`);

  const linkedObjects: any[] = [];
  const unlinkedObjects: any[] = [];

  objects.forEach((o: any) => {
    if (studentObjectMap.has(o.name)) {
      linkedObjects.push({
        name: o.name,
        student: studentObjectMap.get(o.name),
        created_at: o.created_at,
        size: o.metadata?.size
      });
    } else {
      unlinkedObjects.push({
        name: o.name,
        created_at: o.created_at,
        size: o.metadata?.size
      });
    }
  });

  console.log(`Linked objects count: ${linkedObjects.length}`);
  console.log(`Unlinked objects count: ${unlinkedObjects.length}`);

  console.log('\nUnlinked by date:');
  const unlinkedByDate: Record<string, number> = {};
  unlinkedObjects.forEach(o => {
    const d = new Date(o.created_at).toISOString().slice(0, 10);
    unlinkedByDate[d] = (unlinkedByDate[d] || 0) + 1;
  });
  console.log(unlinkedByDate);
}

main().finally(() => prisma.$disconnect());
