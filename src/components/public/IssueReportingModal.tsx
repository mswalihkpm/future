import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitIssueReport } from "@/services/publicLeaderboard";

interface IssueReportingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSprId?: string;
  defaultStudentName?: string;
}

export function IssueReportingModal({
  open,
  onOpenChange,
  defaultSprId = "",
  defaultStudentName = "",
}: IssueReportingModalProps) {
  const [sprOrName, setSprOrName] = useState(defaultSprId || defaultStudentName);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [category, setCategory] = useState("Scoring Inaccuracy");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sprOrName.trim() || !message.trim() || !reporterName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitIssueReport({
        sprIdOrName: sprOrName.trim(),
        reporterName: reporterName.trim(),
        reporterEmail: reporterEmail.trim(),
        category,
        message: message.trim(),
      });
      setSubmitted(true);
      toast.success(res.message);
    } catch {
      toast.error("Failed to submit issue report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setMessage("");
      setReporterName("");
      setReporterEmail("");
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <DialogTitle>Report Data Inaccuracy</DialogTitle>
              <DialogDescription>
                Submit an evaluation, mark, or profile correction request.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h3 className="mt-4 text-lg font-semibold">Report Received</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your inquiry has been cataloged for administrative verification. Corrections will be
              reflected upon staff review.
            </p>
            <Button onClick={handleClose} className="mt-6">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sprOrName">Student Name or SPR ID *</Label>
              <Input
                id="sprOrName"
                value={sprOrName}
                onChange={(e) => setSprOrName(e.target.value)}
                placeholder="e.g. SPR0001 or Muhammed Salih"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="repName">Your Name *</Label>
                <Input
                  id="repName"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Student, Parent or Teacher"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="repEmail">Email / Phone (Optional)</Label>
                <Input
                  id="repEmail"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="For follow-up contact"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category of Issue</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scoring Inaccuracy">Scoring Inaccuracy</SelectItem>
                  <SelectItem value="Missing Exam Marks">Missing Exam Marks</SelectItem>
                  <SelectItem value="Literary / Kalotsav Prize Error">
                    Literary / Kalotsav Prize Error
                  </SelectItem>
                  <SelectItem value="Library Reading Pages Miscount">
                    Library Reading Pages Miscount
                  </SelectItem>
                  <SelectItem value="Spelling or Profile Detail">
                    Spelling or Profile Detail
                  </SelectItem>
                  <SelectItem value="Other Query">Other Query</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg">Details of Inaccuracy *</Label>
              <Textarea
                id="msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe the discrepancy with exam name, date, or event details..."
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground"
              >
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
