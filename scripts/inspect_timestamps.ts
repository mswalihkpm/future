import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=== INVESTIGATING STUDENTS UPDATED AFTER OCT 3 ===');
  const allStudents = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      photoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' }
  });

  const studentsWithPhoto = allStudents.filter(s => s.photoUrl);
  console.log(`Total students with photos: ${studentsWithPhoto.length}`);

  // Check the timestamp encoded in photoUrl:
  // photoUrl format: avatars/st_<token>_<timestamp>.webp
  const photoDetails = studentsWithPhoto.map(s => {
    let timestamp = 0;
    const match = s.photoUrl?.match(/_(\d+)\.webp/);
    if (match) {
      timestamp = parseInt(match[1], 10);
    }
    return {
      studentId: s.studentId,
      sprStudentId: s.sprStudentId,
      name: s.fullName,
      photoUrl: s.photoUrl,
      photoTimestamp: timestamp ? new Date(timestamp).toISOString() : 'unknown',
      studentUpdatedAt: s.updatedAt.toISOString(),
      studentCreatedAt: s.createdAt.toISOString()
    };
  });

  const oct3Photos = photoDetails.filter(p => p.photoTimestamp.startsWith('2026-10-03'));
  const postOct3Photos = photoDetails.filter(p => !p.photoTimestamp.startsWith('2026-10-03'));

  console.log(`Photos uploaded during initial Oct 3 migration: ${oct3Photos.length}`);
  console.log(`Photos uploaded after Oct 3 (newer photo uploads): ${postOct3Photos.length}`);

  console.log('\nPost-Oct 3 Uploads (Newer assigned photos):');
  postOct3Photos.forEach(p => {
    console.log(`- ${p.sprStudentId || p.studentId} | ${p.name} | Uploaded: ${p.photoTimestamp} | UpdatedAt: ${p.studentUpdatedAt}`);
  });

  console.log('\n=== INVESTIGATING public/uploads FILES ===');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log(`Files in public/uploads: ${files.length}`);
    files.forEach(f => {
      const stat = fs.statSync(path.join(uploadsDir, f));
      console.log(`- ${f} | Size: ${(stat.size / 1024).toFixed(1)} KB | Modified: ${stat.mtime.toISOString()}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
