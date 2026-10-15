import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, ErrorState } from "@/components/layout/PageHeader";
import { listCategories } from "@/services/categories";
import { effectiveShare, formatPercent } from "@/lib/spr/calculation";

export const Route = createFileRoute("/_authenticated/weights")({
  head: () => ({
    meta: [
      { title: "Weight Management — SPR" },
      { name: "description", content: "SPR category weights." },
    ],
  }),
  component: WeightsPage,
});

function WeightsPage() {
  const q = useQuery({ queryKey: ["spr-categories"], queryFn: listCategories });
  const active = q.data?.filter((c) => c.is_active) ?? [];
  const total = active.reduce((s, c) => s + c.weight, 0);

  return (
    <>
      <PageHeader
        title="Weight Management"
        description="Weights are stored with high precision. The final SPR divides by the total weight, so the maximum is exactly 100%."
      />
      {q.error && <ErrorState message="Couldn't load categories." />}
      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stored weight</TableHead>
              <TableHead className="text-right">Share of SPR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Skeleton className="h-32 w-full" />
                </TableCell>
              </TableRow>
            )}
            {active.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {c.weight.toFixed(10)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(effectiveShare(c.weight, total), 4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {q.data && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono text-xs">{total.toFixed(10)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Editing weights (administrators only) will be added in a later phase.
      </p>
    </>
  );
}
