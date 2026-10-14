import fs from 'fs';
import path from 'path';

async function checkBackups() {
  const backupsDir = path.join(process.cwd(), 'backups');
  const files = fs.readdirSync(backupsDir);
  console.log('Backup files:', files);

  // Check old_database_export.json
  const oldDbPath = path.join(backupsDir, 'old_database_export.json');
  if (fs.existsSync(oldDbPath)) {
    console.log('Reading old_database_export.json...');
    const content = JSON.parse(fs.readFileSync(oldDbPath, 'utf-8'));
    console.log('Old DB export keys:', Object.keys(content));
    if (content.Student || content.students) {
      const studs = content.Student || content.students;
      console.log(`Old DB students count: ${studs.length}`);
      const withPhoto = studs.filter((s: any) => s.photoUrl);
      console.log(`Old DB students with photo: ${withPhoto.length}`);
      withPhoto.slice(0, 5).forEach((s: any) => {
        console.log(`- ${s.fullName} (${s.studentId}): ${s.photoUrl?.slice(0, 60)}... (length: ${s.photoUrl?.length})`);
      });
    }
  }

  // Check student_photos_backup files
  const photoBackupFiles = files.filter(f => f.startsWith('student_photos_backup_'));
  photoBackupFiles.forEach(f => {
    const p = path.join(backupsDir, f);
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    console.log(`\nPhoto Backup: ${f}`);
    console.log(`Total students: ${data.totalStudents}, with photos: ${data.studentsWithPhotosCount}, base64: ${data.base64PhotosCount}, http: ${data.httpPhotosCount}`);
  });
}

checkBackups();
