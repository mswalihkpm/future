import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isGoogleDriveUrl, formatGoogleDriveDirectUrl } from '@/lib/google-drive';

const photoCache = new Map<string, { buffer: Buffer; contentType: string } | null>();

export function invalidatePhotoCache(studentId?: string) {
  if (studentId) {
    photoCache.delete(studentId);
  } else {
    photoCache.clear();
  }
}

export async function handleStudentPhotoRequest(req: NextRequest, studentIdentifier: string) {
  try {
    if (!studentIdentifier) {
      return new NextResponse('Student ID required', { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentIdentifier },
          { studentId: { equals: studentIdentifier, mode: 'insensitive' } },
          { sprStudentId: { equals: studentIdentifier, mode: 'insensitive' } },
        ],
      },
      select: { id: true, photoUrl: true },
    });

    if (!student || !student.photoUrl || student.photoUrl.trim() === '') {
      return new NextResponse('Photo not found', { status: 404 });
    }

    const photoStr = student.photoUrl.trim();

    // 1. Google Drive URLs: Redirect directly to Google CDN edge
    if (isGoogleDriveUrl(photoStr)) {
      const directUrl = formatGoogleDriveDirectUrl(photoStr, 360) || photoStr;
      return NextResponse.redirect(directUrl, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    // 2. Direct external HTTPS URL: Redirect directly
    if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
      return NextResponse.redirect(photoStr, {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });
    }

    // 3. Data URI fallback (Base64)
    if (photoStr.startsWith('data:image/')) {
      const parts = photoStr.split(';base64,');
      if (parts.length === 2) {
        const contentType = parts[0].replace('data:', '');
        const buffer = Buffer.from(parts[1], 'base64');
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    }

    return new NextResponse('Photo format not supported', { status: 404 });
  } catch (err: any) {
    console.error('Photo fetch error:', err);
    return new NextResponse('Error loading photo', { status: 500 });
  }
}
