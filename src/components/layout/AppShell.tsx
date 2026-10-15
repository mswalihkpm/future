import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MODULES, MODULE_GROUPS, type AppModule } from "@/lib/modules";
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

function moduleHref(m: AppModule) {
  return m.status === "ready" ? `/${m.slug}` : `/modules/${m.slug}`;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">SPR</p>
              <p className="text-[11px] opacity-70">Ma'din School of Excellence</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {MODULE_GROUPS.map((group) => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="text-sidebar-foreground/60">{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {MODULES.filter((m) => m.group === group).map((m) => {
                    const href = moduleHref(m);
                    return (
                      <SidebarMenuItem key={m.slug}>
                        <SidebarMenuButton asChild isActive={location.pathname === href}>
                          <Link to={href}>
                            <m.icon />
                            <span>{m.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-2 py-1 text-xs">
            <p className="truncate font-medium">{user?.email}</p>
            <p className="capitalize opacity-70">{user?.roles.join(", ") || "No role assigned"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            <LogOut className="size-4" /> Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">Student Performance Rating</span>
        </header>
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
          {user && user.roles.length === 0 ? <NoRoleNotice /> : <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NoRoleNotice() {
  return (
    <div className="surface-card p-8 text-center">
      <h1 className="text-2xl font-semibold">Awaiting access</h1>
      <p className="mt-2 text-muted-foreground">Your account is active, but an administrator still needs to assign you a role.</p>
    </div>
  );
}
