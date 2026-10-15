/**
 * Media and Student Photo Handling
 * 
 * Rules:
 * 1. Never store Base64 images in database rows.
 * 2. Convert Google Drive share URLs to direct CDN thumbnail URLs:
 *    https://lh3.googleusercontent.com/d/{FILE_ID}=s360
 * 3. Gracefully validate external HTTP/HTTPS image URLs.
 */

export const BASE64_IMAGE_PREFIX = /^data:image\/[a-z0-9+.-]+;base64,/i;

export interface PhotoUrlValidationResult {
  valid: boolean;
  normalizedUrl: string | null;
  error?: string | undefined;
  isGoogleDrive?: boolean | undefined;
}

/**
 * Extracts Google Drive file ID from various sharing link formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://drive.google.com/uc?id={FILE_ID}
 * - https://drive.google.com/thumbnail?id={FILE_ID}
 * - https://lh3.googleusercontent.com/d/{FILE_ID}
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Pattern 1: drive.google.com/file/d/{ID}
  const fileDMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern 2: drive.google.com/(open|uc|thumbnail)?id={ID}
  const idParamMatch = trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail|file)\?[^#]*\bid=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Pattern 3: lh3.googleusercontent.com/d/{ID}
  const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  return null;
}

/**
 * Normalizes photo URLs:
 * - Rejects Base64 with an explicit error.
 * - Converts Google Drive links to Google CDN =s360 direct thumbnails.
 * - Returns normalized URL string or null if empty.
 */
export function normalizePhotoUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (BASE64_IMAGE_PREFIX.test(trimmed)) {
    throw new Error(
      "Base64 photo storage is strictly prohibited. Please provide a direct image URL or Google Drive link."
    );
  }

  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}=s360`;
  }

  // Ensure it's a valid URL format
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Photo URL must use http or https protocol.");
    }
    return trimmed;
  } catch (err) {
    if (err instanceof Error && err.message.includes("protocol")) {
      throw err;
    }
    throw new Error("Invalid photo URL format.");
  }
}

/**
 * Validates a photo URL safely without throwing
 */
export function validatePhotoUrl(url: string | null | undefined): PhotoUrlValidationResult {
  if (!url || !url.trim()) {
    return { valid: true, normalizedUrl: null };
  }

  try {
    const normalized = normalizePhotoUrl(url);
    const isDrive = extractGoogleDriveFileId(url) !== null;
    return { valid: true, normalizedUrl: normalized, isGoogleDrive: isDrive };
  } catch (err) {
    return {
      valid: false,
      normalizedUrl: null,
      error: err instanceof Error ? err.message : "Invalid photo URL",
    };
  }
}
