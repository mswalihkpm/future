import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const buckets: any = await prisma.$queryRawUnsafe(`SELECT * FROM storage.buckets;`);
  console.log('Buckets:', buckets);

  const objectsByPrefix: any = await prisma.$queryRawUnsafe(`
    SELECT 
      bucket_id,
      split_part(name, '/', 1) as folder,
      count(*) as count,
      min(created_at) as earliest,
      max(created_at) as latest
    FROM storage.objects
    GROUP BY bucket_id, split_part(name, '/', 1);
  `);
  console.log('Objects by Folder:', objectsByPrefix);

  // Check how many students have photoUrl pointing to Supabase Storage
  const studentsWithStorageUrl = await prisma.student.findMany({
    where: {
      photoUrl: {
        contains: '/storage/v1/object/public/'
      }
    },
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      photoUrl: true,
      updatedAt: true
    }
  });

  console.log(`Students with Supabase Storage photoUrl: ${studentsWithStorageUrl.length}`);

  // Extract the object names from students' photoUrl
  const studentObjectNames = new Set<string>();
  studentsWithStorageUrl.forEach(s => {
    if (s.photoUrl) {
      const match = s.photoUrl.match(/student-photos\/(.+)$/);
      if (match) {
        studentObjectNames.add(match[1]);
      }
    }
  });

  console.log(`Unique storage objects referenced in student.photoUrl: ${studentObjectNames.size}`);

  // Check if there are storage objects that are NOT in studentObjectNames
  const allObjects: any = await prisma.$queryRawUnsafe(`SELECT name, created_at, metadata FROM storage.objects;`);
  const unreferencedObjects = allObjects.filter((o: any) => !studentObjectNames.has(o.name));
  console.log(`Storage objects NOT currently referenced in student.photoUrl: ${unreferencedObjects.length}`);
  console.log('Unreferenced samples (first 10):', unreferencedObjects.slice(0, 10));
  console.log('Unreferenced samples (last 10):', unreferencedObjects.slice(-10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
