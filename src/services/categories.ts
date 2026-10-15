import { supabase } from "@/integrations/supabase/client";

export interface SprCategory {
  id: string;
  code: string;
  name: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
}

export async function listCategories(): Promise<SprCategory[]> {
  const { data, error } = await supabase
    .from("spr_categories")
    .select("id, code, name, weight, sort_order, is_active")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((c) => ({ ...c, weight: Number(c.weight) }));
}
