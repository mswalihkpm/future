import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { extractGoogleDriveFileId, formatGoogleDriveDirectUrl } from '../src/lib/google-drive';
import { normalizeSprId } from '../src/lib/spr-id';

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

export interface PhotoMappingRecord {
  sprStudentId?: string;
  studentId?: string;
  fullName?: string;
  driveUrl: string;
}

export async function mapGoogleDrivePhotos(
  filePathOrData: string | PhotoMappingRecord[],
  options?: { dryRun?: boolean }
) {
  const isDryRun = options?.dryRun ?? false;
  console.log('====================================================');
  console.log('   BULK GOOGLE DRIVE PHOTO URL MIGRATION TOOL       ');
  console.log('====================================================');
  if (isDryRun) {
    console.log('*** DRY RUN MODE: No changes will be written to PostgreSQL ***\n');
  }

  let mappings: PhotoMappingRecord[] = [];

  if (typeof filePathOrData === 'string') {
    const resolvedPath = path.resolve(process.cwd(), filePathOrData);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Mapping file not found at: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8').trim();
    if (resolvedPath.endsWith('.json')) {
      const parsed = JSON.parse(content);
      mappings = Array.isArray(parsed) ? parsed : parsed.mappings || [];
    } else {
      // CSV / TSV parsing
      const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && (line.toLowerCase().includes('spr') || line.toLowerCase().includes('drive') || line.toLowerCase().includes('photo'))) {
          continue; // skip header
        }
        const delimiter = line.includes('\t') ? '\t' : ',';
        const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          mappings.push({
            sprStudentId: parts[0],
            driveUrl: parts[1],
            fullName: parts[2] || undefined,
          });
        }
      }
    }
  } else {
    mappings = filePathOrData;
  }

  console.log(`Loaded ${mappings.length} mapping entries to process.`);

  const allDbStudents = await prisma.student.findMany({
    select: {
      id: true,
      studentId: true,
      sprStudentId: true,
      fullName: true,
      photoUrl: true,
      class: { select: { name: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  console.log(`Total students in PostgreSQL: ${allDbStudents.length}\n`);

  let matchedCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < mappings.length; i++) {
    const item = mappings[i];
    const rawSprId = item.sprStudentId?.trim();
    const rawStudentId = item.studentId?.trim();
    const rawUrl = item.driveUrl?.trim();

    if (!rawUrl) {
      console.warn(`[!] Entry #${i + 1}: Missing URL for ${item.fullName || rawSprId || 'unknown'}`);
      invalidCount++;
      continue;
    }

    const directUrl = formatGoogleDriveDirectUrl(rawUrl);
    if (!directUrl) {
      console.warn(`[!] Entry #${i + 1}: Could not parse Google Drive URL: ${rawUrl}`);
      invalidCount++;
      continue;
    }

    const normalizedSpr = rawSprId ? normalizeSprId(rawSprId) : '';
    const student = allDbStudents.find((s) => {
      if (normalizedSpr && s.sprStudentId && normalizeSprId(s.sprStudentId) === normalizedSpr) return true;
      if (rawSprId && s.sprStudentId && s.sprStudentId.toLowerCase() === rawSprId.toLowerCase()) return true;
      if (rawStudentId && s.studentId && s.studentId.toLowerCase() === rawStudentId.toLowerCase()) return true;
      return false;
    });

    if (!student) {
      console.warn(`[-] Entry #${i + 1}: No matching student in DB for SPR ID: "${rawSprId}" (${item.fullName || 'no name'})`);
      skippedCount++;
      continue;
    }

    console.log(
      `[✓] [${i + 1}/${mappings.length}] Match: ${student.sprStudentId} - ${student.fullName} (${student.class?.name})`
    );
    console.log(`    Direct CDN URL: ${directUrl}`);

    if (!isDryRun) {
      await prisma.student.update({
        where: { id: student.id },
        data: { photoUrl: directUrl },
      });
    }

    matchedCount++;
  }

  console.log('\n====================================================');
  console.log('           MAPPING EXECUTION SUMMARY                ');
  console.log('====================================================');
  console.log(`- Total Entries Processed: ${mappings.length}`);
  console.log(`- Students Successfully Matched: ${matchedCount}`);
  console.log(`- Students Missing / Unmatched:  ${skippedCount}`);
  console.log(`- Invalid URLs:                  ${invalidCount}`);
  if (isDryRun) {
    console.log('\n[NOTICE] This was a DRY RUN. Re-run without --dry-run to commit changes.');
  }

  return { matchedCount, skippedCount, invalidCount };
}

// Standalone execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const filePath = args.find((a) => !a.startsWith('--'));

  if (!filePath) {
    console.log('Usage: npx tsx scripts/map_google_drive_photos.ts <mapping_file.json|csv> [--dry-run]');
    process.exit(1);
  }

  mapGoogleDrivePhotos(filePath, { dryRun: isDryRun })
    .catch((err) => {
      console.error('[Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
