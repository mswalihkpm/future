import fs from 'fs';
import path from 'path';

const p = path.join(process.cwd(), 'backups', 'old_database_export.json');
const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
console.log('Keys of export_data:', Object.keys(raw.export_data));

if (raw.export_data.Student) {
  const studs = raw.export_data.Student;
  console.log(`Student count: ${studs.length}`);
  const withPhoto = studs.filter((s: any) => s.photoUrl);
  console.log(`With photo: ${withPhoto.length}`);
  withPhoto.slice(0, 5).forEach((s: any) => {
    console.log(`- ${s.fullName} (${s.studentId}): ${s.photoUrl?.slice(0, 50)}... len: ${s.photoUrl?.length}`);
  });
}
