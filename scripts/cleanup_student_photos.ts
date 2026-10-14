import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { getSupabaseAdminClient, STORAGE_BUCKET } from '../src/lib/supabase-storage';

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

export async function cleanupStudentPhotos(options?: { dryRun?: boolean }) {
  const isDryRun = options?.dryRun ?? true;

  console.log('========================================================');
  console.log('   SPR STUDENT PHOTO CLEANUP & REMOVAL EXECUTION        ');
  console.log('========================================================');
  if (isDryRun) {
    console.log('*** DRY RUN MODE: No database values or storage files will be deleted ***\n');
  }

  // 1. Check all students in PostgreSQL
  const allStudents = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      photoUrl: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const studentsWithPhoto = allStudents.filter((s) => s.photoUrl && s.photoUrl.trim().length > 0);
  console.log(`[Database Inspection]`);
  console.log(`- Total Students in Database: ${allStudents.length}`);
  console.log(`- Students with active photoUrl to be cleared: ${studentsWithPhoto.length}`);

  // 2. Check Supabase Storage objects
  let storageObjects: any[] = [];
  try {
    storageObjects = await prisma.$queryRawUnsafe(`
      SELECT id, bucket_id, name 
      FROM storage.objects 
      WHERE bucket_id = 'student-photos';
    `);
  } catch (err: any) {
    console.warn('Could not query storage.objects via raw SQL:', err.message);
  }

  console.log(`\n[Storage Inspection]`);
  console.log(`- Total files in Supabase Storage bucket 'student-photos': ${storageObjects.length}`);

  // 3. Check Local public/uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const localUploadFiles = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f) => f.startsWith('student_'))
    : [];
  console.log(`\n[Local Files Inspection]`);
  console.log(`- Total legacy student photo files in public/uploads: ${localUploadFiles.length}`);

  console.log('\n--------------------------------------------------------');
  console.log(`PROPOSED DELETIONS SUMMARY:`);
  console.log(`1. Database: Update ${studentsWithPhoto.length} student records (set photoUrl = NULL). ZERO student rows deleted.`);
  console.log(`2. Supabase Storage: Delete ${storageObjects.length} avatar files in bucket 'student-photos'.`);
  console.log(`3. Local Disk: Delete ${localUploadFiles.length} files in 'public/uploads'.`);
  console.log('--------------------------------------------------------\n');

  if (isDryRun) {
    console.log('[DRY RUN COMPLETE] Zero data was modified.');
    return {
      dryRun: true,
      dbPhotosToClear: studentsWithPhoto.length,
      storageObjectsToDelete: storageObjects.length,
      localFilesToDelete: localUploadFiles.length,
      studentsPreserved: allStudents.length,
    };
  }

  // --- LIVE EXECUTION ---

  // 1. Clear photoUrl in PostgreSQL (Narrow, targeted UPDATE statement)
  console.log(`\n[Step 1] Clearing photoUrl for ${studentsWithPhoto.length} student records...`);
  const updateResult = await prisma.student.updateMany({
    where: {
      photoUrl: {
        not: null,
      },
    },
    data: {
      photoUrl: null,
    },
  });
  console.log(`[Step 1 Complete] Updated ${updateResult.count} student photoUrl fields to NULL.`);

  // 2. Delete Supabase Storage objects
  console.log(`\n[Step 2] Removing ${storageObjects.length} files from Supabase Storage 'student-photos'...`);
  const supabase = getSupabaseAdminClient();
  const filePaths = storageObjects.map((o) => o.name);

  // Batch delete in chunks of 50
  let deletedStorageCount = 0;
  for (let i = 0; i < filePaths.length; i += 50) {
    const chunk = filePaths.slice(i, i + 50);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
    if (error) {
      console.error(`Error deleting storage chunk ${i}-${i + chunk.length}:`, error.message);
    } else {
      deletedStorageCount += chunk.length;
    }
  }
  console.log(`[Step 2 Complete] Successfully deleted ${deletedStorageCount} objects from Supabase Storage.`);

  // 3. Delete local legacy files
  console.log(`\n[Step 3] Removing ${localUploadFiles.length} legacy student files from public/uploads...`);
  let deletedLocalCount = 0;
  for (const f of localUploadFiles) {
    try {
      fs.unlinkSync(path.join(uploadsDir, f));
      deletedLocalCount++;
    } catch (e: any) {
      console.error(`Failed to delete local file ${f}:`, e.message);
    }
  }
  console.log(`[Step 3 Complete] Deleted ${deletedLocalCount} local files.`);

  // 4. Verify post-cleanup state
  console.log(`\n[Step 4] Verifying post-cleanup state...`);
  const remainingWithPhoto = await prisma.student.count({
    where: { photoUrl: { not: null } },
  });
  const totalStudentsAfter = await prisma.student.count();
  const remainingStorage: any = await prisma.$queryRawUnsafe(
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'student-photos';`
  );

  console.log(`- Total Students: ${totalStudentsAfter} (100% preserved)`);
  console.log(`- Students with remaining photoUrl: ${remainingWithPhoto}`);
  console.log(`- Remaining Supabase Storage objects in 'student-photos': ${remainingStorage[0]?.count}`);

  return {
    dryRun: false,
    dbPhotosCleared: updateResult.count,
    storageObjectsDeleted: deletedStorageCount,
    localFilesDeleted: deletedLocalCount,
    studentsPreserved: totalStudentsAfter,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live') || args.includes('--execute');
  cleanupStudentPhotos({ dryRun: !isLive })
    .catch((err) => {
      console.error('[Cleanup Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
