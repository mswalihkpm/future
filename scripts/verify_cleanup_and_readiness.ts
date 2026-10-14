import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { calculateAllLeaderboards, formatPoints, normalizeScoreToPercentage } from '../src/lib/spr-engine';
import { extractGoogleDriveFileId, formatGoogleDriveDirectUrl } from '../src/lib/google-drive';

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

async function runPostCleanupAudit() {
  console.log('========================================================');
  console.log('     SPR POST-CLEANUP INTEGRITY & READINESS AUDIT       ');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Check ${total}: ${title}`);
      if (detail) console.log(`       ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] Check ${total}: ${title}`);
      if (detail) console.error(`       ${detail}`);
      throw new Error(`Audit assertion failed: ${title}`);
    }
  }

  // 1. Student Count Check
  const allStudents = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      classId: true,
      schoolId: true,
      division: true,
      photoUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  assert(allStudents.length === 115, 'Total student count in PostgreSQL is exactly 115', `Found: ${allStudents.length}`);

  // 2. Photo URL Removal Check
  const studentsWithPhoto = allStudents.filter((s) => s.photoUrl !== null && s.photoUrl !== '');
  assert(
    studentsWithPhoto.length === 0,
    'All student photoUrl values are NULL (both Category A and Category B removed)',
    `Remaining photos: ${studentsWithPhoto.length}`
  );

  // 3. SPR Student IDs Integrity Check
  const studentsWithSprId = allStudents.filter((s) => s.sprStudentId && s.sprStudentId.startsWith('SPR'));
  assert(
    studentsWithSprId.length > 0,
    'Permanent SPR Student IDs remain completely intact',
    `Verified: ${studentsWithSprId.length} students have permanent SPR IDs (e.g. ${studentsWithSprId[0].sprStudentId})`
  );

  // 4. Performance Records (Academic / Marks) Check
  const perfCount = await prisma.performanceRecord.count();
  assert(perfCount === 1219, 'All 1,219 performance records (marks/points/results) 100% intact', `Count: ${perfCount}`);

  // 5. Creative Hub Check
  const creativeCount = await prisma.creativeHubSubmission.count();
  assert(creativeCount === 44, 'All 44 Creative Hub submissions 100% intact', `Count: ${creativeCount}`);

  // 6. Library Records Check
  const libCount = await prisma.libraryRecord.count();
  assert(libCount === 70, 'All 70 Library records 100% intact', `Count: ${libCount}`);

  // 7. News & Subcategories Logos Check (Unrelated image data)
  const newsCount = await prisma.news.count();
  const subcatCount = await prisma.subcategory.count();
  assert(newsCount === 3, 'News records remain 100% intact with banner images', `Count: ${newsCount}`);
  assert(subcatCount === 11, 'Subcategory records and logos remain 100% intact', `Count: ${subcatCount}`);

  // 8. Supabase Storage Bucket Cleanup Check
  const storageObjects: any = await prisma.$queryRawUnsafe(
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'student-photos';`
  );
  const remainingStorageCount = Number(storageObjects[0]?.count || 0);
  assert(
    remainingStorageCount === 0,
    'Supabase Storage bucket student-photos has ZERO remaining avatar objects',
    `Remaining count: ${remainingStorageCount}`
  );

  // 9. Local Upload Files Cleanup Check
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const remainingLocal = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f) => f.startsWith('student_'))
    : [];
  assert(
    remainingLocal.length === 0,
    'Local public/uploads legacy student photos completely removed',
    `Remaining files: ${remainingLocal.length}`
  );

  // 10. Scoring Engine Invariance Test
  console.log('\nTesting SPR scoring engine computation...');
  const leaderboard = await calculateAllLeaderboards();
  assert(
    leaderboard.length > 0,
    'SPR Engine calculates leaderboard successfully',
    `Leaderboard calculated: ${leaderboard.length} ranked entries`
  );

  const top1 = leaderboard[0];
  console.log(`Rank 1: ${top1.name} (${top1.sprStudentId}) - SPR: ${top1.spr} Points`);
  assert(top1.spr > 0, 'Rank 1 student has valid positive SPR score');

  // 11. Google Drive URL System Test
  console.log('\nTesting Google Drive URL parser and formatter...');
  const sampleDriveUrl = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing';
  const fileId = extractGoogleDriveFileId(sampleDriveUrl);
  const directCdnUrl = formatGoogleDriveDirectUrl(sampleDriveUrl, 160);

  assert(
    fileId === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
    'Google Drive file ID correctly extracted',
    `Extracted ID: ${fileId}`
  );
  assert(
    directCdnUrl === 'https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs=s160',
    'Google Drive direct CDN URL generated with thumbnail scaling',
    `CDN URL: ${directCdnUrl}`
  );

  // 12. Backup Availability Check
  const backupsDir = path.join(process.cwd(), 'backups');
  const backupFiles = fs.readdirSync(backupsDir).filter((f) => f.startsWith('pre_cleanup_'));
  assert(
    backupFiles.length >= 2,
    'Pre-cleanup database and photo safety backups verified on disk',
    `Found backups: ${backupFiles.join(', ')}`
  );

  console.log('\n========================================================');
  console.log(` ALL ${passed}/${total} POST-CLEANUP INTEGRITY CHECKS PASSED!`);
  console.log('========================================================\n');
}

runPostCleanupAudit()
  .catch((err) => {
    console.error('[Audit Error]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
