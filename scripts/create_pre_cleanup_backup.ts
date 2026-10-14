import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function createPreCleanupBackup() {
  console.log('=== STARTING PRE-CLEANUP SAFETY BACKUP ===');

  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  // 1. Student Photos Dedicated Backup
  const allStudents = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      division: true,
      classId: true,
      schoolId: true,
      academicYearId: true,
      status: true,
      photoUrl: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { fullName: 'asc' },
  });

  const studentsWithPhotos = allStudents.filter(s => s.photoUrl && s.photoUrl.trim().length > 0);

  // 2. Storage Objects Backup
  let storageObjects: any[] = [];
  try {
    storageObjects = await prisma.$queryRawUnsafe(`
      SELECT id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata
      FROM storage.objects
      WHERE bucket_id = 'student-photos'
      ORDER BY created_at ASC;
    `);
  } catch (e: any) {
    console.warn('Could not query storage.objects:', e.message);
  }

  // 3. Full Database Tables Export
  console.log('Backing up all core database tables...');
  const fullDatabaseDump: Record<string, any> = {
    backupMetadata: {
      timestamp: new Date().toISOString(),
      purpose: 'SPR Student Photo Cleanup and Google Drive Migration Pre-Deletion Safety Backup',
      totalStudents: allStudents.length,
      studentsWithPhotosCount: studentsWithPhotos.length,
      totalStorageObjects: storageObjects.length,
    },
    students: allStudents,
    storageObjects: storageObjects,
    classes: await prisma.academicClass.findMany(),
    schools: await prisma.school.findMany(),
    academicYears: await prisma.academicYear.findMany(),
    terms: await prisma.term.findMany(),
    categories: await prisma.category.findMany(),
    subcategories: await prisma.subcategory.findMany(),
    levels: await prisma.level.findMany(),
    exams: await prisma.exam.findMany(),
    subjects: await prisma.subject.findMany(),
    programs: await prisma.program.findMany(),
    competitions: await prisma.competition.findMany(),
    literaryEvents: await prisma.literaryEvent.findMany(),
    literaryCompetitions: await prisma.literaryCompetition.findMany(),
    creativeHubCategories: await prisma.creativeHubCategory.findMany(),
    publishedMedia: await prisma.publishedMedia.findMany(),
    creativeWorks: await prisma.creativeHubSubmission.findMany(),
    performanceRecords: await prisma.performanceRecord.findMany(),
    categoryWeights: await prisma.categoryWeight.findMany(),
    libraryIntegrations: await prisma.libraryIntegration.findMany(),
    libraryRecords: await prisma.libraryRecord.findMany(),
    users: await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, updatedAt: true }
    }),
    systemSettings: await prisma.systemSetting.findMany(),
    news: await prisma.news.findMany(),
  };

  // Write full database backup
  const fullBackupFile = path.join(backupsDir, `pre_cleanup_full_database_backup_${timestampStr}.json`);
  fs.writeFileSync(fullBackupFile, JSON.stringify(fullDatabaseDump, null, 2), 'utf-8');

  // Write dedicated student photos backup
  const photoBackupData = {
    backupTimestamp: new Date().toISOString(),
    totalStudents: allStudents.length,
    studentsWithPhotosCount: studentsWithPhotos.length,
    studentsWithPhotos: studentsWithPhotos.map(s => ({
      id: s.id,
      studentId: s.studentId,
      sprStudentId: s.sprStudentId,
      fullName: s.fullName,
      photoUrl: s.photoUrl,
    })),
    storageObjectsCount: storageObjects.length,
    storageObjects: storageObjects.map(o => ({
      id: o.id,
      name: o.name,
      bucket_id: o.bucket_id,
      created_at: o.created_at,
      size: o.metadata?.size,
    })),
  };

  const photoBackupFile = path.join(backupsDir, `pre_cleanup_student_photos_backup_${timestampStr}.json`);
  fs.writeFileSync(photoBackupFile, JSON.stringify(photoBackupData, null, 2), 'utf-8');

  // Verification step
  console.log('\n--- VERIFYING BACKUP INTEGRITY ---');
  const readFull = JSON.parse(fs.readFileSync(fullBackupFile, 'utf-8'));
  const readPhoto = JSON.parse(fs.readFileSync(photoBackupFile, 'utf-8'));

  if (readFull.students.length !== 115) {
    throw new Error(`Integrity check failed: Expected 115 students, got ${readFull.students.length}`);
  }
  if (readPhoto.studentsWithPhotos.length !== 69) {
    throw new Error(`Integrity check failed: Expected 69 students with photos, got ${readPhoto.studentsWithPhotos.length}`);
  }
  if (readPhoto.storageObjects.length !== 231) {
    throw new Error(`Integrity check failed: Expected 231 storage objects, got ${readPhoto.storageObjects.length}`);
  }

  const fullSizeMB = (fs.statSync(fullBackupFile).size / (1024 * 1024)).toFixed(2);
  const photoSizeMB = (fs.statSync(photoBackupFile).size / (1024 * 1024)).toFixed(2);

  console.log(`[PASS] Full DB Backup verified: ${fullBackupFile} (${fullSizeMB} MB)`);
  console.log(`[PASS] Photos Backup verified: ${photoBackupFile} (${photoSizeMB} MB)`);
  console.log(`- Total Students: ${readFull.students.length}`);
  console.log(`- Students with Photos: ${readPhoto.studentsWithPhotos.length}`);
  console.log(`- Storage Objects: ${readPhoto.storageObjects.length}`);
  console.log(`- Performance Records: ${readFull.performanceRecords.length}`);
  console.log(`- Creative Works: ${readFull.creativeWorks.length}`);
  console.log(`- Library Records: ${readFull.libraryRecords.length}`);
  console.log('=== PRE-CLEANUP BACKUP COMPLETED SUCCESSFULLY ===');
}

createPreCleanupBackup()
  .catch(err => {
    console.error('[Backup Failed]', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
