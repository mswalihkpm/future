import { supabase } from "@/integrations/supabase/client";

export interface StudentListParams {
  search?: string;
  page: number;
  pageSize: number;
}

export interface StudentRow {
  id: string;
  spr_id: string;
  full_name: string;
  father_name: string | null;
  student_type: string | null;
  is_active: boolean;
  class: { name: string; section: string | null } | null;
  house: { name: string } | null;
}

/** Paginated, server-filtered student list. Only the columns the table needs. */
export async function listStudents({ search, page, pageSize }: StudentListParams) {
  const from = (page - 1) * pageSize;
  let query = supabase
    .from("students")
    .select("id, spr_id, full_name, father_name, student_type, is_active, class:classes(name, section), house:houses(name)", { count: "exact" })
    .order("full_name")
    .range(from, from + pageSize - 1);

  const term = search?.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,spr_id.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as StudentRow[], total: count ?? 0 };
}
