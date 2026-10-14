import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const totalStudents = await prisma.student.count();
  const studentsWithStorage = await prisma.student.count({
    where: { photoUrl: { contains: '/storage/v1/object/public/' } }
  });
  const studentsWithBase64 = await prisma.student.count({
    where: { photoUrl: { startsWith: 'data:image/' } }
  });
  const studentsWithNull = await prisma.student.count({
    where: { photoUrl: null }
  });
  const studentsWithEmpty = await prisma.student.count({
    where: { photoUrl: '' }
  });

  const allStudents = await prisma.student.findMany({
    select: { id: true, studentId: true, sprStudentId: true, fullName: true, photoUrl: true }
  });
  const otherPhotos = allStudents.filter(s => s.photoUrl && !s.photoUrl.startsWith('data:image/') && !s.photoUrl.includes('/storage/v1/object/public/'));

  const totalStorageObjects: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM storage.objects;`);
  const buckets: any = await prisma.$queryRawUnsafe(`SELECT * FROM storage.buckets;`);

  console.log({
    totalStudents,
    studentsWithStorage,
    studentsWithBase64,
    studentsWithNull,
    studentsWithEmpty,
    otherPhotosCount: otherPhotos.length,
    otherPhotos,
    storageBucketCount: buckets.length,
    buckets,
    totalStorageObjects: totalStorageObjects[0]?.count
  });
}
main().finally(() => prisma.$disconnect());
