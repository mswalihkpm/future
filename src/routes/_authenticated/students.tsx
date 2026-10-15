import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, ErrorState } from "@/components/layout/PageHeader";
import { listStudents } from "@/services/students";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — SPR" }, { name: "description", content: "Student registry with permanent SPR IDs." }] }),
  component: StudentsPage,
});

function StudentsPage() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(input); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const q = useQuery({
    queryKey: ["students", search, page],
    queryFn: () => listStudents({ search, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Students" description="Every student has a permanent, unique SPR Student ID." />
      <div className="surface-card overflow-hidden">
        <div className="border-b p-4">
          <label className="relative block max-w-sm">
            <span className="sr-only">Search students</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name or SPR ID" className="pl-9" />
          </label>
        </div>
        {q.error ? (
          <div className="p-4"><ErrorState message="Couldn't load students." /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SPR ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Father's name</TableHead>
                <TableHead className="hidden sm:table-cell">Class</TableHead>
                <TableHead className="hidden lg:table-cell">House</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
              ))}
              {q.data?.rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.spr_id}</TableCell>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="hidden md:table-cell">{s.father_name ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{s.class ? `${s.class.name}${s.class.section ? ` ${s.class.section}` : ""}` : "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{s.house?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {q.data && q.data.rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <Users className="size-8" />
            <p>{search ? "No students match your search." : "No students yet. Adding students comes in the next phase."}</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground">
          <span>{q.data?.total ?? 0} students</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </>
  );
}
