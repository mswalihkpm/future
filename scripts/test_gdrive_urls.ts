export function extractGoogleDriveFileId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // Pattern 1: /file/d/ID
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchFileD) return matchFileD[1];

  // Pattern 2: id=ID or &id=ID
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (matchIdParam) return matchIdParam[1];

  // Pattern 3: /d/ID (e.g. googleusercontent.com/d/ID)
  const matchDPath = trimmed.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchDPath) return matchDPath[1];

  // Pattern 4: Raw file ID directly (typically 25-45 alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function formatGoogleDriveDirectUrl(urlOrId: string, size?: number): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    // lh3.googleusercontent.com/d/FILE_ID provides high-performance, direct CDN image delivery
    // Sizing parameter =s{size} prevents unnecessary egress/data loading for thumbnails
    if (size && size > 0) {
      return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
    }
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // If not a recognizable Google Drive URL, return original trimmed string
  return trimmed;
}

// Test various formats
const testUrls = [
  'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing',
  'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=drivesdk',
  'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
  'https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
  'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
  'https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
  '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
  'https://example.com/avatar.jpg'
];

testUrls.forEach(u => {
  const fileId = extractGoogleDriveFileId(u);
  const direct = formatGoogleDriveDirectUrl(u, 200);
  console.log({ input: u.slice(0, 45) + '...', fileId, direct });
});
