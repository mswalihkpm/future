import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Lock, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { StudentAvatar } from "./StudentAvatar";
import { createStudent, updateStudent, getNextSprId, type StudentRow } from "@/services/students";
import type { ClassOption, HouseOption } from "@/services/masterData";
import { validatePhotoUrl } from "@/lib/media";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: StudentRow | null; // null for Create, StudentRow for Edit
  classes: ClassOption[];
  houses: HouseOption[];
  onSuccess: () => void;
}

const STUDENT_TYPES = ["Day Scholar", "Residential / Boarder", "Hifz Stream", "General"];

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  classes,
  houses,
  onSuccess,
}: StudentFormDialogProps) {
  const isEdit = Boolean(student);

  const [sprId, setSprId] = useState("");
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [classId, setClassId] = useState<string>("none");
  const [houseId, setHouseId] = useState<string>("none");
  const [studentType, setStudentType] = useState<string>("Day Scholar");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(false);

  // Photo validation and preview state
  const photoValidation = validatePhotoUrl(photoUrl);

  useEffect(() => {
    if (open) {
      if (student) {
        setSprId(student.spr_id);
        setFullName(student.full_name);
        setFatherName(student.father_name ?? "");
        setDateOfBirth(student.date_of_birth ?? "");
        setClassId(student.class_id ?? "none");
        setHouseId(student.house_id ?? "none");
        setStudentType(student.student_type ?? "Day Scholar");
        setPhotoUrl(student.photo_url ?? "");
        setIsActive(student.is_active);
      } else {
        // Create mode: fetch next available sequential SPR ID
        setFullName("");
        setFatherName("");
        setDateOfBirth("");
        setClassId(classes[0]?.id ?? "none");
        setHouseId("none");
        setStudentType("Day Scholar");
        setPhotoUrl("");
        setIsActive(true);

        setLoadingId(true);
        getNextSprId()
          .then((nextId) => setSprId(nextId))
          .catch((err) => {
            console.error("Failed to fetch next SPR ID", err);
            setSprId("SPR0001");
          })
          .finally(() => setLoadingId(false));
      }
    }
  }, [open, student, classes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Student full name is required.");
      return;
    }

    if (photoUrl && !photoValidation.valid) {
      toast.error(photoValidation.error ?? "Invalid photo URL");
      return;
    }

    setLoading(true);
    try {
      if (isEdit && student) {
        await updateStudent(student.id, {
          full_name: fullName,
          father_name: fatherName,
          date_of_birth: dateOfBirth || null,
          class_id: classId === "none" ? null : classId,
          house_id: houseId === "none" ? null : houseId,
          student_type: studentType,
          photo_url: photoUrl,
          is_active: isActive,
        });
        toast.success(`Student ${fullName} updated successfully.`);
      } else {
        await createStudent({
          spr_id: sprId,
          full_name: fullName,
          father_name: fatherName,
          date_of_birth: dateOfBirth || null,
          class_id: classId === "none" ? null : classId,
          house_id: houseId === "none" ? null : houseId,
          student_type: studentType,
          photo_url: photoUrl,
          is_active: isActive,
        });
        toast.success(`Student ${fullName} (${sprId}) created successfully.`);
      }

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save student.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Edit Student Profile" : "Register New Student"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update academic and personal details. The permanent SPR Student ID cannot be modified."
              : "Register a new student with a unique, permanent SPR Student ID."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* SPR ID Banner */}
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <Label
                  htmlFor="spr_id"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Permanent SPR Student ID
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  {loadingId ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <span className="font-mono text-base font-bold text-foreground">
                      {sprId || "SPR0001"}
                    </span>
                  )}
                  {isEdit ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      <Lock className="size-3" /> Permanent & Immutable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <Sparkles className="size-3" /> Auto-Generated
                    </span>
                  )}
                </div>
              </div>

              {!isEdit && (
                <div className="w-36">
                  <Input
                    id="spr_id"
                    value={sprId}
                    onChange={(e) => setSprId(e.target.value.toUpperCase())}
                    placeholder="SPR0001"
                    className="font-mono text-xs uppercase"
                    maxLength={10}
                  />
                </div>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              SPR Student IDs are permanent once assigned and protected by database triggers.
            </p>
          </div>

          {/* Full Name & Father Name */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ahmad Rayan"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fatherName">Father's Name</Label>
              <Input
                id="fatherName"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Muhammad Ali"
              />
            </div>
          </div>

          {/* Class & House */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="class">Academic Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No class assigned</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="house">House</Label>
              <Select value={houseId} onValueChange={setHouseId}>
                <SelectTrigger id="house">
                  <SelectValue placeholder="Select house" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No house assigned</SelectItem>
                  {houses.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date of Birth & Student Type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studentType">Student Type</Label>
              <Select value={studentType} onValueChange={setStudentType}>
                <SelectTrigger id="studentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photo URL & Live Thumbnail Preview */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="photoUrl" className="flex items-center gap-1.5">
              <ImageIcon className="size-4 text-muted-foreground" />
              Photograph URL (Google Drive / External CDN)
            </Label>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Input
                  id="photoUrl"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view or image URL"
                  className={!photoValidation.valid ? "border-destructive" : ""}
                />
                {!photoValidation.valid && (
                  <p className="text-xs text-destructive">{photoValidation.error}</p>
                )}
                {photoValidation.valid && photoValidation.isGoogleDrive && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    ✓ Google Drive link automatically converted to direct 360px thumbnail CDN.
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center justify-center">
                <StudentAvatar
                  photoUrl={photoValidation.valid ? photoValidation.normalizedUrl : null}
                  fullName={fullName || "Student"}
                  size="lg"
                />
                <span className="mt-1 text-[10px] text-muted-foreground">Preview</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Images are loaded directly from external CDNs. Base64 blobs are strictly prohibited in
              database rows.
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active Student</p>
              <p className="text-xs text-muted-foreground">
                Active students appear on leaderboards and have SPR scores calculated.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
