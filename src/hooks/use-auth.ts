import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Current user plus their roles. Roles are read from the protected user_roles table. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return { id: user.id, email: user.email ?? "", roles: (roles ?? []).map((r) => r.role as AppRole) };
    },
    staleTime: 60_000,
  });
}
