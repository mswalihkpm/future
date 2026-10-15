import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Edit2,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader, ErrorState } from "@/components/layout/PageHeader";
import {
  listStudents,
  toggleStudentStatus,
  exportStudentsToExcel,
  type StudentRow,
} from "@/services/students";
import {
  listClasses,
  listHouses,
  listInstitutions,
  initializeMasterDataIfEmpty,
} from "@/services/masterData";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { StudentFormDialog } from "@/components/students/StudentFormDialog";
import { StudentImportDialog } from "@/components/students/StudentImportDialog";
import { useCurrentUser } from "@/hooks/use-auth";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({
    meta: [
      { title: "Student Registry — SPR" },
      { name: "description", content: "Student registry with permanent sequential SPR IDs and performance ratings." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const canManage = user?.roles.includes("admin") || user?.roles.includes("coordinator");

  // State
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [houseFilter, setHouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "spr_id" | "created_at">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Master data queries
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: () => listClasses() });
  const housesQuery = useQuery({ queryKey: ["houses"], queryFn: () => listHouses() });
  const institutionsQuery = useQuery({ queryKey: ["institutions"], queryFn: () => listInstitutions() });

  // Students query
  const studentsQuery = useQuery({
    queryKey: ["students", search, page, classFilter, houseFilter, statusFilter, sortBy, sortOrder],
    queryFn: () =>
      listStudents({
        search,
        page,
        pageSize: PAGE_SIZE,
        classId: classFilter === "all" ? undefined : classFilter,
        houseId: houseFilter === "all" ? undefined : houseFilter,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        sortBy,
        sortOrder,
      }),
    placeholderData: keepPreviousData,
  });

  const students = studentsQuery.data?.rows ?? [];
  const total = studentsQuery.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Initialize master data if empty
  async function handleInitializeDefaults() {
    try {
      await initializeMasterDataIfEmpty();
      toast.success("Default institutions, academic year, and classes initialized.");
      queryClient.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize defaults.");
    }
  }

  // Toggle active status
  async function handleToggleStatus(student: StudentRow) {
    try {
      await toggleStudentStatus(student.id, !student.is_active);
      toast.success(`Student ${student.full_name} is now ${!student.is_active ? "Active" : "Inactive"}.`);
      queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status.");
    }
  }

  function handleOpenCreate() {
    setEditingStudent(null);
    setFormOpen(true);
  }

  function handleOpenEdit(student: StudentRow) {
    setEditingStudent(student);
    setFormOpen(true);
  }

  function handleExport() {
    if (students.length === 0) {
      toast.error("No students to export.");
      return;
    }
    exportStudentsToExcel(students);
    toast.success("Student records exported to Excel.");
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Student Registry"
          description="Every student is assigned a permanent, unique, and immutable SPR Student ID."
        />
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                className="gap-1.5"
              >
                <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                Import Excel
              </Button>
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="size-4" />
                Add Student
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={students.length === 0}
            className="gap-1.5"
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter and Search HUD */}
      <div className="surface-card mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by student name or SPR ID (e.g. SPR0001)..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Class filter */}
            <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36 text-xs">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {(classesQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* House filter */}
            <Select value={houseFilter} onValueChange={(v) => { setHouseFilter(v); setPage(1); }}>
              <SelectTrigger className="w-32 text-xs">
                <SelectValue placeholder="All Houses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Houses</SelectItem>
                {(housesQuery.data ?? []).map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v: "all" | "active" | "inactive") => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="w-28 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(val) => {
                const [col, ord] = val.split("-") as ["name" | "spr_id" | "created_at", "asc" | "desc"];
                setSortBy(col);
                setSortOrder(ord);
              }}
            >
              <SelectTrigger className="w-36 text-xs">
                <ArrowUpDown className="mr-1 size-3" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                <SelectItem value="spr_id-asc">SPR ID (0001...)</SelectItem>
                <SelectItem value="spr_id-desc">SPR ID (Desc)</SelectItem>
              </SelectContent>
            </Select>

            {(search || classFilter !== "all" || houseFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setClassFilter("all");
                  setHouseFilter("all");
                  setStatusFilter("all");
                  setPage(1);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="surface-card overflow-hidden">
        {studentsQuery.error ? (
          <div className="p-6">
            <ErrorState message="Could not load students. Please verify your connection." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Avatar</TableHead>
                  <TableHead>SPR ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="hidden md:table-cell">Father's Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="hidden lg:table-cell">House</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="w-12 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsQuery.isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="size-8 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                      {canManage && <TableCell><Skeleton className="size-6 ml-auto" /></TableCell>}
                    </TableRow>
                  ))}

                {students.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <StudentAvatar
                        photoUrl={s.photo_url}
                        fullName={s.full_name}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                        {s.spr_id}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {s.full_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {s.father_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {s.class ? (
                        <span className="font-medium">
                          {s.class.name}
                          {s.class.section ? ` (${s.class.section})` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {s.house?.name ? (
                        <Badge variant="outline" className="font-normal text-xs">
                          {s.house.name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {s.student_type ?? "General"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.is_active ? "default" : "secondary"}
                        className={
                          s.is_active
                            ? "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-600/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreVertical className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(s)}>
                              <Edit2 className="mr-2 size-3.5" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(s)}>
                              {s.is_active ? (
                                <>
                                  <XCircle className="mr-2 size-3.5 text-amber-600" />
                                  Mark Inactive
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 size-3.5 text-emerald-600" />
                                  Mark Active
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!studentsQuery.isLoading && students.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Users className="size-7" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">
              {search || classFilter !== "all" || houseFilter !== "all"
                ? "No students match your active filters"
                : "No students registered yet"}
            </h3>
            <p className="max-w-md text-sm">
              {search || classFilter !== "all"
                ? "Try clearing your search terms or selecting 'All Classes'."
                : "Get started by adding your first student manually or uploading an Excel spreadsheet."}
            </p>
            {canManage && !search && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" onClick={handleOpenCreate}>
                  <UserPlus className="mr-1 size-4" /> Add Student
                </Button>
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <FileSpreadsheet className="mr-1 size-4" /> Import Excel
                </Button>
                {(classesQuery.data?.length ?? 0) === 0 && (
                  <Button variant="secondary" size="sm" onClick={handleInitializeDefaults}>
                    <Sparkles className="mr-1 size-4" /> Initialize Standard Classes
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t p-4 text-xs text-muted-foreground">
          <span>
            Showing {students.length} of {total} registered students
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              Previous
            </Button>
            <span>
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StudentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        student={editingStudent}
        classes={classesQuery.data ?? []}
        houses={housesQuery.data ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />

      <StudentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        classes={classesQuery.data ?? []}
        houses={housesQuery.data ?? []}
        institutions={institutionsQuery.data ?? []}
        existingSprIds={students.map((s) => s.spr_id)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />
    </>
  );
}
