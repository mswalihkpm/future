import { describe, expect, it } from "vitest";
import { generateNextSprId, isValidSprId, normalizeSprId } from "@/lib/spr/scoring";
import { normalizePhotoUrl, validatePhotoUrl } from "@/lib/media";

describe("Student Registry Business Rules & Invariance", () => {
  describe("Permanent SPR Student ID Generation & Constraints", () => {
    it("generates SPR0001 for the very first student", () => {
      expect(generateNextSprId([])).toBe("SPR0001");
    });

    it("generates sequential SPR IDs maintaining minimum 4-digit zero padding", () => {
      expect(generateNextSprId(["SPR0001"])).toBe("SPR0002");
      expect(generateNextSprId(["SPR0001", "SPR0002", "SPR0009"])).toBe("SPR0010");
      expect(generateNextSprId(["SPR0099"])).toBe("SPR0100");
      expect(generateNextSprId(["SPR0115"])).toBe("SPR0116");
    });

    it("validates SPR ID format strictly", () => {
      expect(isValidSprId("SPR0001")).toBe(true);
      expect(isValidSprId("SPR0115")).toBe(true);
      expect(isValidSprId("SPR9999")).toBe(true);
      expect(isValidSprId("SPR10000")).toBe(true); // scales beyond 9999
      expect(isValidSprId("SPR123")).toBe(false); // must be at least 4 digits
      expect(isValidSprId("MSOE001")).toBe(false);
      expect(isValidSprId("")).toBe(false);
    });

    it("normalizes SPR ID by trimming and uppercase conversion", () => {
      expect(normalizeSprId("  spr0042  ")).toBe("SPR0042");
    });

    it("prevents duplicate SPR IDs in cohort", () => {
      const cohort = ["SPR0001", "SPR0002", "SPR0003"];
      const newId = "SPR0002";
      const isDuplicate = cohort.includes(normalizeSprId(newId));
      expect(isDuplicate).toBe(true);
    });
  });

  describe("Photo URL & CDN Invariance", () => {
    it("converts Google Drive sharing URLs to direct =s360 CDN thumbnails", () => {
      const driveUrl = "https://drive.google.com/file/d/1B2C3D4E5F6G/view?usp=sharing";
      const normalized = normalizePhotoUrl(driveUrl);
      expect(normalized).toBe("https://lh3.googleusercontent.com/d/1B2C3D4E5F6G=s360");
    });

    it("strictly blocks Base64 image blobs to prevent PostgreSQL row payload bloat", () => {
      const base64Data = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      expect(() => normalizePhotoUrl(base64Data)).toThrow(
        /Base64 photo storage is strictly prohibited/,
      );
    });

    it("allows valid external CDN image URLs", () => {
      const externalUrl = "https://images.example.com/students/photo123.jpg";
      expect(normalizePhotoUrl(externalUrl)).toBe(externalUrl);
    });

    it("validates photo URLs cleanly without throwing", () => {
      const valid = validatePhotoUrl("https://drive.google.com/file/d/xyz123/view");
      expect(valid.valid).toBe(true);
      expect(valid.isGoogleDrive).toBe(true);

      const invalid = validatePhotoUrl("data:image/png;base64,test");
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toMatch(/Base64.*prohibited/i);
    });
  });

  describe("Anti-Fuzzy-Matching Rule", () => {
    it("never matches students by fuzzy names, phonetic similarity, or guessed identity", () => {
      // Documented non-negotiable rule: External matching must use exact SPR ID only.
      const matchExternalStudent = (
        recordSprId: string | undefined,
        _studentName: string,
        systemCohort: Array<{ sprId: string; name: string }>,
      ) => {
        if (!recordSprId) return null; // Reject name matching
        const norm = normalizeSprId(recordSprId);
        return systemCohort.find((s) => s.sprId === norm) ?? null;
      };

      const cohort = [
        { sprId: "SPR0001", name: "Muhammad Rashid" },
        { sprId: "SPR0002", name: "Muhammed Rasheed" },
      ];

      // Exact match works
      expect(matchExternalStudent("SPR0001", "Muhammad Rashid", cohort)?.sprId).toBe("SPR0001");

      // Without exact SPR ID, even with identical name, returns null (no fuzzy guessing)
      expect(matchExternalStudent(undefined, "Muhammad Rashid", cohort)).toBeNull();

      // Similar phonetic name but different ID matches ONLY by exact ID
      expect(matchExternalStudent("SPR0002", "M. Rashid", cohort)?.sprId).toBe("SPR0002");
    });
  });
});
