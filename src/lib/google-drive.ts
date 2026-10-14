/**
 * Google Drive URL Utilities for SPR Student Photos
 * 
 * Converts standard Google Drive sharing links into high-performance,
 * direct image CDN URLs (using lh3.googleusercontent.com/d/FILE_ID).
 * 
 * Supports dynamic size parameters (e.g. =s200) to prevent loading
 * multi-megabyte original photos for small avatars, drastically reducing bandwidth.
 */

/**
 * Extracts the unique Google Drive file ID from any standard Google Drive URL or ID string.
 */
export function extractGoogleDriveFileId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Pattern 1: /file/d/FILE_ID
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchFileD) return matchFileD[1];

  // Pattern 2: id=FILE_ID or &id=FILE_ID
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (matchIdParam) return matchIdParam[1];

  // Pattern 3: /d/FILE_ID (lh3.googleusercontent.com/d/FILE_ID)
  const matchDPath = trimmed.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (matchDPath) return matchDPath[1];

  // Pattern 4: Raw file ID directly (alphanumeric, at least 25 characters)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Checks if a string is a Google Drive URL or valid Google Drive file ID.
 */
export function isGoogleDriveUrl(urlOrId: string | null | undefined): boolean {
  return extractGoogleDriveFileId(urlOrId) !== null;
}

/**
 * Converts a Google Drive link or file ID into a direct, high-performance CDN image URL.
 * 
 * @param urlOrId Google Drive sharing URL, view URL, thumbnail URL, or raw file ID
 * @param size Optional target pixel width/height for responsive thumbnail sizing (e.g. 200)
 */
export function formatGoogleDriveDirectUrl(
  urlOrId: string | null | undefined,
  size?: number
): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    // lh3.googleusercontent.com/d/{id} provides high-availability direct image CDN delivery
    // The optional =s{size} parameter resizes on Google's edge, preventing client-side data waste
    if (size && size > 0) {
      return `https://lh3.googleusercontent.com/d/${fileId}=s${size}`;
    }
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // If not a Google Drive URL, return the original URL if it is a valid HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }

  return null;
}
