import { supabase } from "@/integrations/supabase/client";

export interface InstitutionOption {
  id: string;
  name: string;
  code: string | null;
}

export interface AcademicYearOption {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
}

export interface ClassOption {
  id: string;
  name: string;
  section: string | null;
  institution_id: string;
  academic_year_id: string;
  institution?: { name: string; code: string | null } | null;
}

export interface HouseOption {
  id: string;
  name: string;
}

export async function listInstitutions(): Promise<InstitutionOption[]> {
  const { data, error } = await supabase
    .from("institutions")
    .select("id, name, code")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listAcademicYears(): Promise<AcademicYearOption[]> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, label, starts_on, ends_on, is_current")
    .order("starts_on", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCurrentAcademicYear(): Promise<AcademicYearOption | null> {
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, label, starts_on, ends_on, is_current")
    .eq("is_current", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listClasses(institutionId?: string): Promise<ClassOption[]> {
  let query = supabase
    .from("classes")
    .select("id, name, section, institution_id, academic_year_id, institution:institutions(name, code)")
    .order("name")
    .order("section");
  if (institutionId) {
    query = query.eq("institution_id", institutionId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ClassOption[];
}

export async function listHouses(): Promise<HouseOption[]> {
  const { data, error } = await supabase
    .from("houses")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/**
 * Standard default institutional data documented in original SPR system
 */
export const DEFAULT_INSTITUTIONS = [
  { name: "Ma'din School of Excellence", code: "MSOE" },
  { name: "GBHS Malappuram", code: "GBHS" },
  { name: "GBHSS Malappuram", code: "GBHSS" },
  { name: "CM Academy", code: "CMA" },
  { name: "Ma'din Higher Secondary School", code: "MHSS" },
  { name: "DUHSS Panakkad", code: "DUHSS" },
];

export const DEFAULT_HOUSES = [
  { name: "Emerald" },
  { name: "Ruby" },
  { name: "Sapphire" },
  { name: "Topaz" },
];

export const DEFAULT_CLASSES = [
  { name: "Class 8", section: "A" },
  { name: "Class 8", section: "B" },
  { name: "Class 9", section: "A" },
  { name: "Class 9", section: "B" },
  { name: "Class 10", section: "A" },
  { name: "Class 10", section: "B" },
  { name: "Class +1", section: "Science" },
  { name: "Class +1", section: "Commerce" },
  { name: "Class +2", section: "Science" },
  { name: "Class +2", section: "Commerce" },
];

/**
 * Ensures default master data exists if the tables are empty.
 * Non-destructive: will never overwrite or duplicate existing records.
 */
export async function initializeMasterDataIfEmpty() {
  const institutions = await listInstitutions();
  let defaultInstId = institutions.find((i) => i.code === "MSOE")?.id;

  if (institutions.length === 0) {
    const { data, error } = await supabase
      .from("institutions")
      .insert(DEFAULT_INSTITUTIONS)
      .select("id, name, code");
    if (!error && data) {
      defaultInstId = data.find((i) => i.code === "MSOE")?.id ?? data[0]?.id;
    }
  }

  const years = await listAcademicYears();
  let currentYearId = years.find((y) => y.is_current)?.id;

  if (years.length === 0) {
    const { data, error } = await supabase
      .from("academic_years")
      .insert({
        label: "2025-2026",
        starts_on: "2025-06-01",
        ends_on: "2026-03-31",
        is_current: true,
      })
      .select("id");
    if (!error && data && data[0]) {
      currentYearId = data[0].id;
    }
  }

  const houses = await listHouses();
  if (houses.length === 0) {
    await supabase.from("houses").insert(DEFAULT_HOUSES);
  }

  const classes = await listClasses();
  if (classes.length === 0 && defaultInstId && currentYearId) {
    const classesToInsert = DEFAULT_CLASSES.map((c) => ({
      name: c.name,
      section: c.section,
      institution_id: defaultInstId!,
      academic_year_id: currentYearId!,
    }));
    await supabase.from("classes").insert(classesToInsert);
  }
}
