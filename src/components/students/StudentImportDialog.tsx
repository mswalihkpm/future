import { useState, useRef, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadStudentImportTemplate,
  parseAndValidateStudentExcel,
  commitStudentImport,
  type ImportValidationResult,
  type ValidatedImportRow,
} from "@/services/excelImport";
import type { ClassOption, HouseOption, InstitutionOption } from "@/services/masterData";

interface StudentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOption[];
  houses: HouseOption[];
  institutions: InstitutionOption[];
  existingSprIds: string[];
  onSuccess: () => void;
}

export function StudentImportDialog({
  open,
  onOpenChange,
  classes,
  houses,
  institutions,
  existingSprIds,
  onSuccess,
}: StudentImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "ERROR" | "WARNING" | "VALID">(
    "ALL",
  );
  const [fileName, setFileName] = useState<string | null>(null);

  function resetState() {
    setValidationResult(null);
    setFileName(null);
    setFilterSeverity("ALL");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseAndValidateStudentExcel(buffer, {
        existingSprIds,
        classes,
        houses,
        institutions,
      });

      setValidationResult(result);
      if (result.errorCount > 0) {
        toast.error(
          `Validation found ${result.errorCount} row error(s). Please review the details below.`,
        );
      } else {
        toast.success(`Validated ${result.totalRows} student rows successfully.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse Excel file.");
      resetState();
    } finally {
      setParsing(false);
    }
  }

  async function handleCommit() {
    if (!validationResult || !validationResult.canCommit) {
      toast.error("Cannot commit import while errors exist.");
      return;
    }

    setCommitting(true);
    try {
      const { successCount } = await commitStudentImport(validationResult.rows);
      toast.success(`Successfully imported ${successCount} student(s) into registry.`);
      onOpenChange(false);
      resetState();
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import students.");
    } finally {
      setCommitting(false);
    }
  }

  const displayedRows = (validationResult?.rows ?? []).filter((r) => {
    if (filterSeverity === "ALL") return true;
    return r.severity === filterSeverity;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) resetState();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
            Batch Student Excel Import (XLSX)
          </DialogTitle>
          <DialogDescription>
            Download the official Excel template, fill in student records, and preview validation
            results before committing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: Template Download & Upload Dropzone */}
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">1. Download Template</p>
              <p className="text-xs text-muted-foreground">
                Includes sample rows, valid column headers, and data formatting instructions.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadStudentImportTemplate()}
              className="gap-2 shrink-0"
            >
              <Download className="size-4" /> Download XLSX Template
            </Button>
          </div>

          <div className="rounded-xl border border-dashed p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="student-excel-upload"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {parsing ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <Upload className="size-6" />
                )}
              </div>
              <p className="text-sm font-semibold">
                {fileName ? `Selected: ${fileName}` : "Upload Completed XLSX Spreadsheet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Drag and drop your spreadsheet here or click below. All rows are validated in memory
                before any database write.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="mt-2"
              >
                {fileName ? "Change File" : "Choose File"}
              </Button>
            </div>
          </div>

          {/* Step 2: Validation Results & Statistics */}
          {validationResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-slate-300 px-2.5 py-1"
                    onClick={() => setFilterSeverity("ALL")}
                  >
                    Total: {validationResult.totalRows}
                  </Badge>
                  <Badge
                    className={`cursor-pointer px-2.5 py-1 ${
                      validationResult.validCount > 0
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => setFilterSeverity("VALID")}
                  >
                    <CheckCircle2 className="mr-1 size-3" /> Valid: {validationResult.validCount}
                  </Badge>
                  {validationResult.warningCount > 0 && (
                    <Badge
                      className="cursor-pointer bg-amber-500 text-white hover:bg-amber-600 px-2.5 py-1"
                      onClick={() => setFilterSeverity("WARNING")}
                    >
                      <AlertTriangle className="mr-1 size-3" /> Warnings:{" "}
                      {validationResult.warningCount}
                    </Badge>
                  )}
                  {validationResult.errorCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="cursor-pointer px-2.5 py-1"
                      onClick={() => setFilterSeverity("ERROR")}
                    >
                      <XCircle className="mr-1 size-3" /> Errors: {validationResult.errorCount}
                    </Badge>
                  )}
                </div>

                <div className="text-xs font-medium">
                  {validationResult.canCommit ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Ready to commit
                    </span>
                  ) : (
                    <span className="text-destructive font-semibold flex items-center gap-1">
                      <XCircle className="size-3.5" /> Fix errors before commit
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Interactive Row-by-Row Table */}
              <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto text-xs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>SPR ID</TableHead>
                      <TableHead>Issues / Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRows.map((r) => (
                      <TableRow
                        key={r.rowNumber}
                        className={
                          r.severity === "ERROR"
                            ? "bg-destructive/10"
                            : r.severity === "WARNING"
                              ? "bg-amber-50/50 dark:bg-amber-950/20"
                              : ""
                        }
                      >
                        <TableCell className="text-center font-mono">{r.rowNumber}</TableCell>
                        <TableCell>
                          {r.severity === "VALID" && (
                            <Badge
                              variant="outline"
                              className="text-emerald-600 border-emerald-300"
                            >
                              Valid
                            </Badge>
                          )}
                          {r.severity === "WARNING" && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Warning
                            </Badge>
                          )}
                          {r.severity === "ERROR" && <Badge variant="destructive">Error</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">{r.fullName || "—"}</TableCell>
                        <TableCell>
                          {r.matchedClassId ? (
                            <span>{r.matchedClassName}</span>
                          ) : (
                            <span className="text-destructive font-semibold">
                              {r.rawClassName || "Missing"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-[11px]">{r.sprId}</span>
                          {r.isAutoSprId && (
                            <Sparkles className="inline ml-1 size-3 text-emerald-600" />
                          )}
                        </TableCell>
                        <TableCell>
                          {r.issues.length > 0 ? (
                            <ul className="list-disc pl-3 space-y-0.5">
                              {r.issues.map((iss, i) => (
                                <li
                                  key={i}
                                  className={
                                    iss.severity === "ERROR"
                                      ? "text-destructive font-medium"
                                      : "text-amber-700 dark:text-amber-400"
                                  }
                                >
                                  {iss.message}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">Ready</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={committing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCommit}
            disabled={!validationResult || !validationResult.canCommit || committing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {committing && <Loader2 className="mr-2 size-4 animate-spin" />}
            Commit Import ({validationResult?.validCount ?? 0} Students)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
