import { supabase } from "@/integrations/supabase/client";

async function countOf(table: "students" | "classes" | "institutions" | "assessment_records") {
  // head:true returns only the count — no rows are transferred.
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStats() {
  const [students, classes, institutions, records, year] = await Promise.all([
    countOf("students"),
    countOf("classes"),
    countOf("institutions"),
    countOf("assessment_records"),
    supabase.from("academic_years").select("label").eq("is_current", true).maybeSingle(),
  ]);
  if (year.error) throw year.error;
  return { students, classes, institutions, records, currentYear: year.data?.label ?? null };
}
