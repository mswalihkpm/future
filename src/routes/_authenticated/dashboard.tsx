import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, School, Building2, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader, ErrorState } from "@/components/layout/PageHeader";
import { getDashboardStats } from "@/services/dashboard";
import { listCategories } from "@/services/categories";
import { effectiveShare, formatPercent } from "@/lib/spr/calculation";
import { MODULES } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SPR" }, { name: "description", content: "SPR admin dashboard overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: getDashboardStats });
  const cats = useQuery({ queryKey: ["spr-categories"], queryFn: listCategories });
  const total = cats.data?.filter((c) => c.is_active).reduce((s, c) => s + c.weight, 0) ?? 0;

  const tiles = [
    { label: "Students", value: stats.data?.students, icon: Users },
    { label: "Classes", value: stats.data?.classes, icon: School },
    { label: "Institutions", value: stats.data?.institutions, icon: Building2 },
    { label: "Assessment records", value: stats.data?.records, icon: ClipboardList },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={stats.data?.currentYear ? `Academic year ${stats.data.currentYear}` : "No current academic year set yet"}
      />
      {stats.error && <ErrorState message="Couldn't load statistics. Please try again." />}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="surface-card p-5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-sm">{t.label}</span>
              <t.icon className="size-4" />
            </div>
            {stats.isLoading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-2 font-display text-3xl font-semibold">{t.value ?? 0}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="surface-card p-6 lg:col-span-3">
          <h2 className="text-xl font-semibold">SPR weight distribution</h2>
          <p className="mb-5 text-sm text-muted-foreground">Final SPR = weighted average of normalized category scores (max 100%).</p>
          {cats.isLoading && <Skeleton className="h-48 w-full" />}
          {cats.error && <ErrorState message="Couldn't load categories." />}
          <ul className="space-y-3">
            {cats.data?.map((c) => {
              const share = effectiveShare(c.weight, total);
              return (
                <li key={c.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">{formatPercent(share)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={c.code === "islamic_studies" ? "h-full bg-gold" : "h-full bg-primary"} style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="surface-card p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold">Modules</h2>
          <p className="mb-4 text-sm text-muted-foreground">Phase 1 foundation — more modules are on the way.</p>
          <ul className="divide-y">
            {MODULES.filter((m) => m.slug !== "dashboard").map((m) => (
              <li key={m.slug}>
                <Link to={(m.status === "ready" ? `/${m.slug}` : `/modules/${m.slug}`) as string} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                  <m.icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{m.title}</span>
                  <Badge variant={m.status === "ready" ? "default" : "secondary"}>{m.status === "ready" ? "Available" : "Planned"}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
