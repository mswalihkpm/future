import { describe, expect, it } from "vitest";
import {
  findMatchingClass,
  findMatchingHouse,
  validateStudentImportData,
  type RawImportRow,
} from "./excelImport";
import type { ClassOption, HouseOption, InstitutionOption } from "./masterData";

describe("Excel Student Import & Validation", () => {
  const mockClasses: ClassOption[] = [
    { id: "c1", name: "Class 8", section: "A", institution_id: "i1", academic_year_id: "y1" },
    { id: "c2", name: "Class 8", section: "B", institution_id: "i1", academic_year_id: "y1" },
    { id: "c3", name: "Class 9", section: "A", institution_id: "i1", academic_year_id: "y1" },
    {
      id: "c4",
      name: "Class +1",
      section: "Science",
      institution_id: "i1",
      academic_year_id: "y1",
    },
  ];

  const mockHouses: HouseOption[] = [
    { id: "h1", name: "Emerald" },
    { id: "h2", name: "Ruby" },
    { id: "h3", name: "Sapphire" },
  ];

  const mockInstitutions: InstitutionOption[] = [
    { id: "i1", name: "Ma'din School of Excellence", code: "MSOE" },
  ];

  const context = {
    existingSprIds: ["SPR0001", "SPR0002"],
    classes: mockClasses,
    houses: mockHouses,
    institutions: mockInstitutions,
  };

  describe("Class and House Matching", () => {
    it("matches full class name with section", () => {
      const match = findMatchingClass("Class 8 A", mockClasses);
      expect(match?.id).toBe("c1");
    });

    it("matches compact class representation like 8A", () => {
      const match = findMatchingClass("8A", mockClasses);
      expect(match?.id).toBe("c1");
    });

    it("matches special class names like Class +1 Science", () => {
      const match = findMatchingClass("Class +1 Science", mockClasses);
      expect(match?.id).toBe("c4");
    });

    it("returns null for non-existent class", () => {
      const match = findMatchingClass("Class 12 Z", mockClasses);
      expect(match).toBeNull();
    });

    it("matches house by name case-insensitively", () => {
      const match = findMatchingHouse("emerald", mockHouses);
      expect(match?.id).toBe("h1");
    });
  });

  describe("Row Validation & Error Detection", () => {
    it("detects missing student name as ERROR", () => {
      const rows: RawImportRow[] = [{ "Student Name": "", Class: "Class 8 A" }];
      const result = validateStudentImportData(rows, context);
      expect(result.errorCount).toBe(1);
      expect(result.canCommit).toBe(false);
      expect(result.rows[0]?.issues[0]?.message).toMatch(/Student Name is required/);
    });

    it("detects unmapped class as ERROR", () => {
      const rows: RawImportRow[] = [{ "Student Name": "Rashid", Class: "Unknown Class 99" }];
      const result = validateStudentImportData(rows, context);
      expect(result.errorCount).toBe(1);
      expect(result.canCommit).toBe(false);
      expect(result.rows[0]?.issues[0]?.message).toMatch(/does not match any registered class/);
    });

    it("auto-generates sequential SPR ID starting from next available", () => {
      const rows: RawImportRow[] = [
        { "Student Name": "Rashid", Class: "Class 8 A" },
        { "Student Name": "Zuhair", Class: "Class 8 B" },
      ];
      const result = validateStudentImportData(rows, context);
      // DB has SPR0001, SPR0002 -> new should be SPR0003, SPR0004
      expect(result.rows[0]?.sprId).toBe("SPR0003");
      expect(result.rows[0]?.isAutoSprId).toBe(true);
      expect(result.rows[1]?.sprId).toBe("SPR0004");
      expect(result.rows[1]?.isAutoSprId).toBe(true);
      expect(result.canCommit).toBe(true);
    });

    it("detects duplicate SPR ID collision with existing DB records", () => {
      const rows: RawImportRow[] = [
        { "Student Name": "Hisham", Class: "Class 8 A", "SPR ID": "SPR0001" },
      ];
      const result = validateStudentImportData(rows, context);
      expect(result.errorCount).toBe(1);
      expect(result.rows[0]?.issues[0]?.message).toMatch(/already registered in the database/);
      expect(result.canCommit).toBe(false);
    });

    it("detects duplicate SPR ID within the same batch file", () => {
      const rows: RawImportRow[] = [
        { "Student Name": "Hisham", Class: "Class 8 A", "SPR ID": "SPR0050" },
        { "Student Name": "Tariq", Class: "Class 8 B", "SPR ID": "SPR0050" },
      ];
      const result = validateStudentImportData(rows, context);
      expect(result.errorCount).toBe(1);
      expect(result.rows[1]?.issues[0]?.message).toMatch(
        /found multiple times in this import file/,
      );
      expect(result.canCommit).toBe(false);
    });

    it("rejects Base64 photo payloads in row validation", () => {
      const rows: RawImportRow[] = [
        {
          "Student Name": "Hamza",
          Class: "Class 8 A",
          "Photo URL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=",
        },
      ];
      const result = validateStudentImportData(rows, context);
      expect(result.errorCount).toBe(1);
      expect(result.rows[0]?.issues[0]?.message).toMatch(/Base64.*prohibited/i);
      expect(result.canCommit).toBe(false);
    });

    it("converts Google Drive photo URL to direct =s360 thumbnail CDN", () => {
      const rows: RawImportRow[] = [
        {
          "Student Name": "Hamza",
          Class: "Class 8 A",
          "Photo URL": "https://drive.google.com/file/d/testFileId123/view",
        },
      ];
      const result = validateStudentImportData(rows, context);
      expect(result.errorCount).toBe(0);
      expect(result.rows[0]?.photoUrl).toBe(
        "https://lh3.googleusercontent.com/d/testFileId123=s360",
      );
      expect(result.canCommit).toBe(true);
    });

    it("flags duplicate student name in same class as a WARNING", () => {
      const rows: RawImportRow[] = [
        { "Student Name": "Ali", Class: "Class 8 A" },
        { "Student Name": "Ali", Class: "Class 8 A" },
      ];
      const result = validateStudentImportData(rows, context);
      expect(result.warningCount).toBe(1);
      expect(result.errorCount).toBe(0);
      // Warnings do NOT block commit
      expect(result.canCommit).toBe(true);
    });
  });
});
