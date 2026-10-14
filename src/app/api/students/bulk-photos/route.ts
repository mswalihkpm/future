export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { normalizeSprId } from '@/lib/spr-id';
import { formatGoogleDriveDirectUrl, isGoogleDriveUrl } from '@/lib/google-drive';
import { invalidateEngineCache } from '@/lib/spr-engine';

export interface BulkPhotoMappingItem {
  sprStudentId?: string;
  studentId?: string;
  photoUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    let mappings: BulkPhotoMappingItem[] = [];

    if (Array.isArray(body)) {
      mappings = body;
    } else if (Array.isArray(body.mappings)) {
      mappings = body.mappings;
    } else if (typeof body.csv === 'string') {
      // Parse simple CSV (header: sprStudentId,photoUrl or sprId,driveUrl)
      const lines = body.csv.split('\n').map((l: string) => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (i === 0 && (line.toLowerCase().includes('spr') || line.toLowerCase().includes('photo') || line.toLowerCase().includes('url'))) {
          continue; // skip header line
        }
        const parts = line.split(/[,\t]/).map((p: string) => p.trim());
        if (parts.length >= 2) {
          mappings.push({
            sprStudentId: parts[0],
            photoUrl: parts[1],
          });
        }
      }
    }

    if (mappings.length === 0) {
      return NextResponse.json(
        { error: 'No mapping entries provided. Please provide an array of { sprStudentId, photoUrl } objects.' },
        { status: 400 }
      );
    }

    const allDbStudents = await prisma.student.findMany({
      select: {
        id: true,
        studentId: true,
        sprStudentId: true,
        fullName: true,
        photoUrl: true,
      },
    });

    const updatedStudents: any[] = [];
    const missingStudents: any[] = [];
    const invalidEntries: any[] = [];

    for (const item of mappings) {
      const rawSprId = item.sprStudentId?.trim() || '';
      const rawStudentId = item.studentId?.trim() || '';
      const rawUrl = item.photoUrl?.trim() || '';

      if (!rawUrl) {
        invalidEntries.push({ item, reason: 'Missing photo URL' });
        continue;
      }

      // Format to direct Google Drive CDN URL (or keep original direct URL)
      const directUrl = formatGoogleDriveDirectUrl(rawUrl);
      if (!directUrl) {
        invalidEntries.push({ item, reason: 'Invalid photo URL format' });
        continue;
      }

      // Match student by normalized SPR ID first, then raw SPR ID, then studentId
      const normalizedSpr = rawSprId ? normalizeSprId(rawSprId) : '';

      const matchedStudent = allDbStudents.find((s) => {
        if (normalizedSpr && s.sprStudentId && normalizeSprId(s.sprStudentId) === normalizedSpr) {
          return true;
        }
        if (rawSprId && s.sprStudentId && s.sprStudentId.toLowerCase() === rawSprId.toLowerCase()) {
          return true;
        }
        if (rawStudentId && s.studentId && s.studentId.toLowerCase() === rawStudentId.toLowerCase()) {
          return true;
        }
        return false;
      });

      if (!matchedStudent) {
        missingStudents.push({
          sprStudentId: rawSprId || null,
          studentId: rawStudentId || null,
          reason: 'Student not found in database',
        });
        continue;
      }

      // Update ONLY photoUrl field
      await prisma.student.update({
        where: { id: matchedStudent.id },
        data: { photoUrl: directUrl },
      });

      updatedStudents.push({
        id: matchedStudent.id,
        sprStudentId: matchedStudent.sprStudentId,
        studentId: matchedStudent.studentId,
        fullName: matchedStudent.fullName,
        photoUrl: directUrl,
      });
    }

    if (updatedStudents.length > 0) {
      invalidateEngineCache();
      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'BULK_UPDATE_PHOTOS',
        entity: 'Student',
        newValue: JSON.stringify({
          updatedCount: updatedStudents.length,
          missingCount: missingStudents.length,
          invalidCount: invalidEntries.length,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      totalProcessed: mappings.length,
      updatedCount: updatedStudents.length,
      missingCount: missingStudents.length,
      invalidCount: invalidEntries.length,
      updatedStudents,
      missingStudents,
      invalidEntries,
    });
  } catch (err: any) {
    console.error('Bulk photo mapping error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to map student photos.' },
      { status: 500 }
    );
  }
}
