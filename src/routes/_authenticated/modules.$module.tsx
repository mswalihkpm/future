import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/modules/$module")({
  loader: ({ params }) => {
    const m = findModule(params.module);
    if (!m) throw notFound();
    return { slug: m.slug };
  },
  head: () => ({ meta: [{ title: "Module — SPR" }] }),
  component: PlannedModule,
});

function PlannedModule() {
  const { slug } = Route.useLoaderData();
  const m = findModule(slug)!;
  return (
    <div className="surface-card mx-auto max-w-xl p-10 text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <m.icon className="size-6" />
      </div>
      <h1 className="text-2xl font-semibold">{m.title}</h1>
      <p className="mt-2 text-muted-foreground">{m.description}</p>
      <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        <Construction className="size-3.5" /> Not built yet — planned for a later phase
      </p>
      <div className="mt-6">
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
