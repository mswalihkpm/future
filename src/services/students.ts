import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { generateNextSprId, isValidSprId, normalizeSprId } from "@/lib/spr/scoring";
import { normalizePhotoUrl } from "@/lib/media";
import * as XLSX from "xlsx";

export interface StudentListParams {
  search?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
  classId?: string | undefined;
  houseId?: string | undefined;
  isActive?: boolean | undefined;
  sortBy?: "name" | "spr_id" | "created_at" | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface StudentRow {
  id: string;
  spr_id: string;
  full_name: string;
  father_name: string | null;
  date_of_birth: string | null;
  student_type: string | null;
  photo_url: string | null;
  is_active: boolean;
  class_id?: string | null | undefined;
  house_id?: string | null | undefined;
  class: {
    id?: string | undefined;
    name: string;
    section: string | null;
    institution?: { name: string; code: string | null } | null | undefined;
  } | null;
  house: { id?: string | undefined; name: string } | null;
}

export interface CreateStudentInput {
  spr_id?: string | undefined;
  full_name: string;
  father_name?: string | null | undefined;
  date_of_birth?: string | null | undefined;
  student_type?: string | null | undefined;
  class_id?: string | null | undefined;
  house_id?: string | null | undefined;
  photo_url?: string | null | undefined;
  is_active?: boolean | undefined;
}

export interface UpdateStudentInput {
  full_name?: string | undefined;
  father_name?: string | null | undefined;
  date_of_birth?: string | null | undefined;
  student_type?: string | null | undefined;
  class_id?: string | null | undefined;
  house_id?: string | null | undefined;
  photo_url?: string | null | undefined;
  is_active?: boolean | undefined;
}

type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

/**
 * Paginated, server-filtered student list with optimized column projection
 */
export async function listStudents({
  search,
  page = 1,
  pageSize = 20,
  classId,
  houseId,
  isActive,
  sortBy = "name",
  sortOrder = "asc",
}: StudentListParams) {
  const from = (page - 1) * pageSize;
  let query = supabase
    .from("students")
    .select(
      "id, spr_id, full_name, father_name, date_of_birth, student_type, photo_url, is_active, class_id, house_id, class:classes(id, name, section, institution:institutions(name, code)), house:houses(id, name)",
      { count: "exact" },
    );

  // Search filter
  const term = search?.trim().replace(/[%,()]/g, "");
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,spr_id.ilike.%${term}%`);
  }

  // Class filter
  if (classId && classId !== "all") {
    query = query.eq("class_id", classId);
  }

  // House filter
  if (houseId && houseId !== "all") {
    query = query.eq("house_id", houseId);
  }

  // Active status filter
  if (typeof isActive === "boolean") {
    query = query.eq("is_active", isActive);
  }

  // Sorting
  const sortColumn =
    sortBy === "spr_id" ? "spr_id" : sortBy === "created_at" ? "created_at" : "full_name";
  query = query.order(sortColumn, { ascending: sortOrder === "asc" });

  // Pagination
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []) as unknown as StudentRow[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Fetches a single student by ID
 */
export async function getStudentById(id: string): Promise<StudentRow | null> {
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, spr_id, full_name, father_name, date_of_birth, student_type, photo_url, is_active, class_id, house_id, class:classes(id, name, section, institution:institutions(name, code)), house:houses(id, name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as StudentRow | null;
}

/**
 * Safely computes the next sequential SPR ID (e.g. SPR0001, SPR0002)
 */
export async function getNextSprId(): Promise<string> {
  const { data, error } = await supabase
    .from("students")
    .select("spr_id")
    .order("spr_id", { ascending: false });

  if (error) throw error;
  const ids = (data ?? []).map((s) => s.spr_id);
  return generateNextSprId(ids);
}

/**
 * Creates a new student record with validated, unique SPR ID
 */
export async function createStudent(input: CreateStudentInput): Promise<StudentRow> {
  if (!input.full_name || !input.full_name.trim()) {
    throw new Error("Student full name is required.");
  }

  const sprId = input.spr_id ? normalizeSprId(input.spr_id) : await getNextSprId();

  if (!isValidSprId(sprId)) {
    throw new Error(`Invalid SPR ID format: ${sprId}. Must follow /SPR\\d{4,}/ (e.g. SPR0001).`);
  }

  // Check if SPR ID is already taken
  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("spr_id", sprId)
    .maybeSingle();

  if (existing) {
    throw new Error(`SPR ID ${sprId} is already assigned to another student.`);
  }

  // Normalize photo URL (converts Google Drive share links to =s360 direct thumbnail CDN)
  const normalizedPhoto = normalizePhotoUrl(input.photo_url);

  const { data, error } = await supabase
    .from("students")
    .insert({
      spr_id: sprId,
      full_name: input.full_name.trim(),
      father_name: input.father_name?.trim() || null,
      date_of_birth: input.date_of_birth || null,
      student_type: input.student_type?.trim() || null,
      class_id: input.class_id || null,
      house_id: input.house_id || null,
      photo_url: normalizedPhoto,
      is_active: input.is_active ?? true,
    })
    .select(
      "id, spr_id, full_name, father_name, date_of_birth, student_type, photo_url, is_active, class_id, house_id, class:classes(id, name, section, institution:institutions(name, code)), house:houses(id, name)",
    )
    .single();

  if (error) throw error;
  return data as unknown as StudentRow;
}

/**
 * Updates an existing student.
 * Permanent SPR ID is IMMUTABLE and cannot be modified.
 */
export async function updateStudent(id: string, input: UpdateStudentInput): Promise<StudentRow> {
  if (input.full_name !== undefined && !input.full_name.trim()) {
    throw new Error("Student full name cannot be empty.");
  }

  const updates: StudentUpdate = {};

  if (input.full_name !== undefined) updates.full_name = input.full_name.trim();
  if (input.father_name !== undefined) updates.father_name = input.father_name?.trim() || null;
  if (input.date_of_birth !== undefined) updates.date_of_birth = input.date_of_birth || null;
  if (input.student_type !== undefined) updates.student_type = input.student_type?.trim() || null;
  if (input.class_id !== undefined) updates.class_id = input.class_id || null;
  if (input.house_id !== undefined) updates.house_id = input.house_id || null;
  if (input.photo_url !== undefined) updates.photo_url = normalizePhotoUrl(input.photo_url);
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select(
      "id, spr_id, full_name, father_name, date_of_birth, student_type, photo_url, is_active, class_id, house_id, class:classes(id, name, section, institution:institutions(name, code)), house:houses(id, name)",
    )
    .single();

  if (error) throw error;
  return data as unknown as StudentRow;
}

/**
 * Toggles student active/inactive status
 */
export async function toggleStudentStatus(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("students").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

/**
 * Generates an XLSX file containing the student records and triggers a browser download
 */
export function exportStudentsToExcel(
  students: StudentRow[],
  filename = "SPR_Student_Registry.xlsx",
) {
  const exportRows = students.map((s) => ({
    "SPR ID": s.spr_id,
    "Full Name": s.full_name,
    Class: s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "",
    Institution: s.class?.institution?.name || "Ma'din School of Excellence",
    House: s.house?.name || "",
    "Father Name": s.father_name || "",
    "Date of Birth": s.date_of_birth || "",
    "Student Type": s.student_type || "",
    Status: s.is_active ? "Active" : "Inactive",
    "Photo URL": s.photo_url || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

  // Auto-fit column widths
  const colWidths = [
    { wch: 12 }, // SPR ID
    { wch: 25 }, // Full Name
    { wch: 15 }, // Class
    { wch: 30 }, // Institution
    { wch: 15 }, // House
    { wch: 20 }, // Father Name
    { wch: 15 }, // Date of Birth
    { wch: 15 }, // Student Type
    { wch: 10 }, // Status
    { wch: 35 }, // Photo URL
  ];
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, filename);
}
