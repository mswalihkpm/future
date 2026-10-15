import { describe, expect, it } from "vitest";
import {
  extractGoogleDriveFileId,
  normalizePhotoUrl,
  validatePhotoUrl,
} from "./media";

describe("Media and Photo URL Handler", () => {
  it("extracts file ID from Google Drive sharing link", () => {
    const url = "https://drive.google.com/file/d/1a2B3c4D5e6F7g8H9i0/view?usp=sharing";
    expect(extractGoogleDriveFileId(url)).toBe("1a2B3c4D5e6F7g8H9i0");
  });

  it("extracts file ID from Google Drive uc/open link", () => {
    const url = "https://drive.google.com/uc?id=1a2B3c4D5e6F7g8H9i0&export=download";
    expect(extractGoogleDriveFileId(url)).toBe("1a2B3c4D5e6F7g8H9i0");
  });

  it("converts Google Drive link to direct =s360 thumbnail CDN URL", () => {
    const url = "https://drive.google.com/file/d/1XyZ987AbCdEf/view";
    const normalized = normalizePhotoUrl(url);
    expect(normalized).toBe("https://lh3.googleusercontent.com/d/1XyZ987AbCdEf=s360");
  });

  it("strictly rejects Base64 image payloads with an error", () => {
    const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(() => normalizePhotoUrl(base64Data)).toThrow(/Base64 photo storage is strictly prohibited/);
  });

  it("passes through standard external CDN URLs untouched", () => {
    const cdnUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=360";
    expect(normalizePhotoUrl(cdnUrl)).toBe(cdnUrl);
  });

  it("returns null for empty or whitespace photo URLs", () => {
    expect(normalizePhotoUrl("")).toBeNull();
    expect(normalizePhotoUrl("   ")).toBeNull();
    expect(normalizePhotoUrl(null)).toBeNull();
    expect(normalizePhotoUrl(undefined)).toBeNull();
  });

  it("safely validates URLs with validatePhotoUrl without throwing", () => {
    const base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const res = validatePhotoUrl(base64);
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Base64/);

    const driveRes = validatePhotoUrl("https://drive.google.com/file/d/test1234/view");
    expect(driveRes.valid).toBe(true);
    expect(driveRes.isGoogleDrive).toBe(true);
    expect(driveRes.normalizedUrl).toBe("https://lh3.googleusercontent.com/d/test1234=s360");
  });
});
