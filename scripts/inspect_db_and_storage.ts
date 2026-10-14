import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Ensure .env is loaded
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  console.log('=== SUMMARY OF DB AND STORAGE ===');

  const students = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      photoUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const nullPhotos = students.filter(s => !s.photoUrl || s.photoUrl.trim() === '');
  const base64Photos = students.filter(s => s.photoUrl && s.photoUrl.startsWith('data:image/'));
  const supabaseStoragePhotos = students.filter(s => s.photoUrl && s.photoUrl.includes('/storage/v1/object/public/'));
  const otherPhotos = students.filter(s => s.photoUrl && !s.photoUrl.startsWith('data:image/') && !s.photoUrl.includes('/storage/v1/object/public/'));

  console.log(`Total students in DB: ${students.length}`);
  console.log(`- Null/Empty photoUrl: ${nullPhotos.length}`);
  console.log(`- Base64 photoUrl: ${base64Photos.length}`);
  console.log(`- Supabase Storage photoUrl: ${supabaseStoragePhotos.length}`);
  console.log(`- Other photoUrl: ${otherPhotos.length}`);

  if (otherPhotos.length > 0) {
    console.log('Other photos:', otherPhotos.map(s => ({ id: s.studentId, name: s.fullName, url: s.photoUrl })));
  }

  // Check Storage Objects
  const buckets: any = await prisma.$queryRawUnsafe(`SELECT id, name, public FROM storage.buckets;`);
  console.log('\nStorage Buckets:', buckets);

  const objectsCount: any = await prisma.$queryRawUnsafe(`SELECT count(*) FROM storage.objects;`);
  console.log('Total Storage Objects Count:', objectsCount[0]?.count);

  const objectsByBucket: any = await prisma.$queryRawUnsafe(`
    SELECT bucket_id, count(*) as count 
    FROM storage.objects 
    GROUP BY bucket_id;
  `);
  console.log('Objects by Bucket:', objectsByBucket);

  const allObjects: any = await prisma.$queryRawUnsafe(`
    SELECT id, bucket_id, name, created_at, metadata
    FROM storage.objects
    ORDER BY created_at ASC;
  `);
  console.log(`\nAll Storage Objects (${allObjects.length}):`);
  allObjects.forEach((o: any, idx: number) => {
    console.log(`[${idx+1}] Bucket: ${o.bucket_id} | Path: ${o.name} | Size: ${o.metadata?.size} | Created: ${o.created_at}`);
  });

  // Check if any other table has image/photo fields:
  console.log('\n=== OTHER TABLES WITH IMAGE/PHOTO/URL FIELDS ===');
  const newsWithImage = await prisma.news.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, title: true, imageUrl: true }
  });
  console.log(`News with imageUrl: ${newsWithImage.length}`);
  newsWithImage.forEach(n => console.log(`- News: ${n.title} | ${n.imageUrl?.slice(0, 80)}`));

  const subcatWithLogo = await prisma.subcategory.findMany({
    where: { logoUrl: { not: null } },
    select: { id: true, name: true, logoUrl: true }
  });
  console.log(`Subcategories with logoUrl: ${subcatWithLogo.length}`);
  subcatWithLogo.forEach(s => console.log(`- Subcat: ${s.name} | ${s.logoUrl?.slice(0, 80)}`));

  const creativeWithAttachment = await prisma.creativeHubSubmission.findMany({
    where: { OR: [{ attachmentUrl: { not: null } }, { publicationLink: { not: null } }] },
    select: { id: true, title: true, attachmentUrl: true, publicationLink: true }
  });
  console.log(`CreativeHub with attachment/publicationLink: ${creativeWithAttachment.length}`);
  creativeWithAttachment.forEach(c => console.log(`- Creative: ${c.title} | attach: ${c.attachmentUrl} | link: ${c.publicationLink}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
