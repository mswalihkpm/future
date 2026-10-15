import * as XLSX from "xlsx";
import { generateNextSprId, isValidSprId, normalizeSprId } from "@/lib/spr/scoring";
import { validatePhotoUrl } from "@/lib/media";
import type { ClassOption, HouseOption, InstitutionOption } from "./masterData";
import { supabase } from "@/integrations/supabase/client";

export interface RawImportRow {
  "Student Name"?: string | undefined;
  "Full Name"?: string | undefined;
  Name?: string | undefined;
  Class?: string | undefined;
  Institution?: string | undefined;
  School?: string | undefined;
  House?: string | undefined;
  "Father Name"?: string | undefined;
  "Father's Name"?: string | undefined;
  "Date of Birth"?: string | number | Date | undefined;
  DOB?: string | number | Date | undefined;
  "Student Type"?: string | undefined;
  Type?: string | undefined;
  "Photo URL"?: string | undefined;
  Photo?: string | undefined;
  "SPR ID"?: string | undefined;
  SPRID?: string | undefined;
}

export type RowSeverity = "VALID" | "WARNING" | "ERROR";

export interface RowIssue {
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface ValidatedImportRow {
  rowNumber: number;
  fullName: string;
  sprId: string;
  isAutoSprId: boolean;
  rawClassName: string;
  matchedClassId: string | null;
  matchedClassName: string;
  rawHouseName: string;
  matchedHouseId: string | null;
  rawInstitutionName: string;
  fatherName: string | null;
  dateOfBirth: string | null;
  studentType: string | null;
  photoUrl: string | null;
  issues: RowIssue[];
  severity: RowSeverity;
}

export interface ImportValidationResult {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  rows: ValidatedImportRow[];
  canCommit: boolean;
}

/**
 * Downloads a pre-formatted XLSX template for student import with instructions and sample rows
 */
export function downloadStudentImportTemplate(filename = "SPR_Student_Import_Template.xlsx") {
  const sampleData = [
    {
      "Student Name": "Ahmad Rayan",
      Class: "Class 8 A",
      Institution: "Ma'din School of Excellence",
      House: "Emerald",
      "Father Name": "Muhammad Ali",
      "Date of Birth": "2010-04-15",
      "Student Type": "Day Scholar",
      "Photo URL": "https://drive.google.com/file/d/sample-file-id/view",
      "SPR ID": "", // blank to auto-generate
    },
    {
      "Student Name": "Ibrahim Fawaz",
      Class: "Class 9 B",
      Institution: "Ma'din School of Excellence",
      House: "Ruby",
      "Father Name": "Abdul Gafoor",
      "Date of Birth": "2009-11-20",
      "Student Type": "Residential",
      "Photo URL": "",
      "SPR ID": "",
    },
    {
      "Student Name": "Bilal Mansoor",
      Class: "Class 10 A",
      Institution: "Ma'din School of Excellence",
      House: "Sapphire",
      "Father Name": "Mansoor K",
      "Date of Birth": "2008-08-05",
      "Student Type": "Day Scholar",
      "Photo URL": "",
      "SPR ID": "SPR0003", // Explicit SPR ID allowed if unique
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

  worksheet["!cols"] = [
    { wch: 22 }, // Student Name
    { wch: 15 }, // Class
    { wch: 30 }, // Institution
    { wch: 15 }, // House
    { wch: 20 }, // Father Name
    { wch: 15 }, // Date of Birth
    { wch: 15 }, // Student Type
    { wch: 35 }, // Photo URL
    { wch: 15 }, // SPR ID
  ];

  XLSX.writeFile(workbook, filename);
}

/**
 * Helper to match raw class text (e.g. "Class 8 A", "8A", "Class 8", "Class +1 Science")
 */
export function findMatchingClass(raw: string, classes: ClassOption[]): ClassOption | null {
  if (!raw || !classes.length) return null;
  const clean = raw.trim().toLowerCase().replace(/\s+/g, " ");

  // 1. Exact match on full name + section (e.g. "Class 8 A")
  for (const c of classes) {
    const full = `${c.name} ${c.section ?? ""}`.trim().toLowerCase();
    if (clean === full) return c;
  }

  // 2. Exact match on name alone if no section
  for (const c of classes) {
    if (clean === c.name.toLowerCase().trim()) return c;
  }

  // 3. Compact representation like "8A" -> "Class 8" + "A"
  for (const c of classes) {
    const compact = `${c.name.replace(/class/i, "").trim()}${c.section ?? ""}`
      .toLowerCase()
      .replace(/\s+/g, "");
    const testClean = clean.replace(/class/i, "").trim().replace(/\s+/g, "");
    if (testClean === compact) return c;
  }

  return null;
}

/**
 * Helper to match house name
 */
export function findMatchingHouse(raw: string, houses: HouseOption[]): HouseOption | null {
  if (!raw || !houses.length) return null;
  const clean = raw.trim().toLowerCase();
  return houses.find((h) => h.name.toLowerCase().trim() === clean) ?? null;
}

/**
 * Parses and validates an uploaded Excel buffer
 */
export function validateStudentImportData(
  rawData: RawImportRow[],
  context: {
    existingSprIds: string[];
    classes: ClassOption[];
    houses: HouseOption[];
    institutions: InstitutionOption[];
  },
): ImportValidationResult {
  const rows: ValidatedImportRow[] = [];
  const seenSprIdsInBatch = new Set<string>();
  const seenStudentClassPairs = new Set<string>();

  // Determine starting point for sequential SPR IDs
  const currentGeneratedIds = [...context.existingSprIds];

  rawData.forEach((raw, idx) => {
    const rowNumber = idx + 2; // Excel row index (header is row 1)
    const issues: RowIssue[] = [];

    // 1. Full Name Validation
    const nameField = raw["Student Name"] ?? raw["Full Name"] ?? raw.Name;
    const fullName = (nameField ?? "").toString().trim();
    if (!fullName) {
      issues.push({
        field: "Student Name",
        message: "Student Name is required.",
        severity: "ERROR",
      });
    }

    // 2. Class Validation
    const classField = (raw.Class ?? "").toString().trim();
    const matchedClass = findMatchingClass(classField, context.classes);
    if (!classField) {
      issues.push({ field: "Class", message: "Class is required.", severity: "ERROR" });
    } else if (!matchedClass) {
      issues.push({
        field: "Class",
        message: `Class "${classField}" does not match any registered class in the system.`,
        severity: "ERROR",
      });
    }

    // 3. SPR ID Validation & Generation
    const rawSprId = (raw["SPR ID"] ?? raw.SPRID ?? "").toString().trim();
    let finalSprId = "";
    let isAuto = false;

    if (rawSprId) {
      const normalized = normalizeSprId(rawSprId);
      if (!isValidSprId(normalized)) {
        issues.push({
          field: "SPR ID",
          message: `Invalid SPR ID "${rawSprId}". Must follow /SPR\\d{4,}/ (e.g. SPR0001).`,
          severity: "ERROR",
        });
        finalSprId = normalized;
      } else if (context.existingSprIds.includes(normalized)) {
        issues.push({
          field: "SPR ID",
          message: `SPR ID "${normalized}" is already registered in the database. Existing permanent IDs cannot be reused.`,
          severity: "ERROR",
        });
        finalSprId = normalized;
      } else if (seenSprIdsInBatch.has(normalized)) {
        issues.push({
          field: "SPR ID",
          message: `Duplicate SPR ID "${normalized}" found multiple times in this import file.`,
          severity: "ERROR",
        });
        finalSprId = normalized;
      } else {
        finalSprId = normalized;
        seenSprIdsInBatch.add(normalized);
      }
    } else {
      // Auto-generate sequential SPR ID
      isAuto = true;
      finalSprId = generateNextSprId(currentGeneratedIds);
      currentGeneratedIds.push(finalSprId);
      seenSprIdsInBatch.add(finalSprId);
    }

    // 4. House Matching
    const rawHouse = (raw.House ?? "").toString().trim();
    const matchedHouse = findMatchingHouse(rawHouse, context.houses);
    if (rawHouse && !matchedHouse) {
      issues.push({
        field: "House",
        message: `House "${rawHouse}" not found; student will be registered without a house.`,
        severity: "WARNING",
      });
    }

    // 5. Duplicate student in same class detection (Warning)
    if (fullName && classField) {
      const pair = `${fullName.toLowerCase()}__${classField.toLowerCase()}`;
      if (seenStudentClassPairs.has(pair)) {
        issues.push({
          field: "Student Name",
          message: `Possible duplicate student: "${fullName}" appears multiple times in ${classField}.`,
          severity: "WARNING",
        });
      }
      seenStudentClassPairs.add(pair);
    }

    // 6. Photo URL Validation
    const photoRaw = (raw["Photo URL"] ?? raw.Photo ?? "").toString().trim();
    let normalizedPhoto: string | null = null;
    if (photoRaw) {
      const photoVal = validatePhotoUrl(photoRaw);
      if (!photoVal.valid) {
        issues.push({
          field: "Photo URL",
          message:
            photoVal.error ??
            "Invalid photo URL. Base64 is prohibited; use a direct image URL or Google Drive link.",
          severity: "ERROR",
        });
      } else {
        normalizedPhoto = photoVal.normalizedUrl;
      }
    }

    // 7. Date of birth formatting
    const rawDob = raw["Date of Birth"] ?? raw.DOB;
    let formattedDob: string | null = null;
    if (rawDob) {
      if (typeof rawDob === "number") {
        // Excel serial date number
        const excelEpoch = new Date(1899, 11, 30);
        const parsed = new Date(excelEpoch.getTime() + rawDob * 86400000);
        if (!isNaN(parsed.getTime())) {
          formattedDob = parsed.toISOString().split("T")[0] ?? null;
        }
      } else if (rawDob instanceof Date) {
        if (!isNaN(rawDob.getTime())) {
          formattedDob = rawDob.toISOString().split("T")[0] ?? null;
        }
      } else {
        const str = rawDob.toString().trim();
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          formattedDob = parsed.toISOString().split("T")[0] ?? null;
        } else {
          issues.push({
            field: "Date of Birth",
            message: `Could not parse date "${str}". Expected YYYY-MM-DD.`,
            severity: "WARNING",
          });
        }
      }
    }

    const hasError = issues.some((i) => i.severity === "ERROR");
    const hasWarning = issues.some((i) => i.severity === "WARNING");
    const severity: RowSeverity = hasError ? "ERROR" : hasWarning ? "WARNING" : "VALID";

    const fatherNameRaw = raw["Father Name"] ?? raw["Father's Name"];
    const fatherName = fatherNameRaw ? String(fatherNameRaw).trim() || null : null;
    const studentTypeRaw = raw["Student Type"] ?? raw.Type;
    const studentType = studentTypeRaw ? String(studentTypeRaw).trim() || null : null;
    const instRaw = raw.Institution ?? raw.School;
    const rawInstitutionName = instRaw ? String(instRaw).trim() : "";

    rows.push({
      rowNumber,
      fullName,
      sprId: finalSprId,
      isAutoSprId: isAuto,
      rawClassName: classField,
      matchedClassId: matchedClass?.id ?? null,
      matchedClassName: matchedClass
        ? `${matchedClass.name}${matchedClass.section ? ` ${matchedClass.section}` : ""}`
        : classField,
      rawHouseName: rawHouse,
      matchedHouseId: matchedHouse?.id ?? null,
      rawInstitutionName,
      fatherName,
      dateOfBirth: formattedDob,
      studentType,
      photoUrl: normalizedPhoto,
      issues,
      severity,
    });
  });

  const errorCount = rows.filter((r) => r.severity === "ERROR").length;
  const warningCount = rows.filter((r) => r.severity === "WARNING").length;
  const validCount = rows.filter((r) => r.severity === "VALID").length;

  return {
    totalRows: rows.length,
    validCount,
    warningCount,
    errorCount,
    rows,
    canCommit: rows.length > 0 && errorCount === 0,
  };
}

/**
 * Parses an uploaded XLSX file into raw objects and validates them
 */
export async function parseAndValidateStudentExcel(
  fileBuffer: ArrayBuffer,
  context: {
    existingSprIds: string[];
    classes: ClassOption[];
    houses: HouseOption[];
    institutions: InstitutionOption[];
  },
): Promise<ImportValidationResult> {
  const workbook = XLSX.read(fileBuffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Uploaded workbook contains no sheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Selected worksheet is empty.");
  }
  const rawRows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: "" });

  return validateStudentImportData(rawRows, context);
}

/**
 * Commits verified rows to the students table in Supabase
 */
export async function commitStudentImport(
  validRows: ValidatedImportRow[],
): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  // Filter only rows without ERROR
  const commitRows = validRows.filter((r) => r.severity !== "ERROR");
  if (commitRows.length === 0) {
    throw new Error("No valid rows available to import.");
  }

  const payload = commitRows.map((r) => ({
    spr_id: r.sprId,
    full_name: r.fullName,
    father_name: r.fatherName,
    date_of_birth: r.dateOfBirth,
    student_type: r.studentType,
    class_id: r.matchedClassId,
    house_id: r.matchedHouseId,
    photo_url: r.photoUrl,
    is_active: true,
  }));

  const { error, count } = await supabase.from("students").insert(payload);
  if (error) {
    throw new Error(`Database error during batch import: ${error.message}`);
  }

  successCount = count ?? payload.length;
  return { successCount, errors };
}
