import {
  LayoutDashboard, Users, School, CalendarRange, BookOpen, GraduationCap, Award,
  Palette, Library, PenLine, Trophy, FileText, Calculator, Medal, Scale, Layers,
  type LucideIcon,
} from "lucide-react";

export type ModuleStatus = "ready" | "planned";

export interface AppModule {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: "Overview" | "Administration" | "SPR Categories" | "Reports & Scoring";
  status: ModuleStatus;
  /** Linked spr_categories.code for category modules. */
  categoryCode?: string;
}

/** Single source of truth for navigation. Modules marked "planned" render a placeholder. */
export const MODULES: AppModule[] = [
  { slug: "dashboard", title: "Dashboard", description: "Overview of the SPR system", icon: LayoutDashboard, group: "Overview", status: "ready" },
  { slug: "students", title: "Students", description: "Student registry with permanent SPR IDs", icon: Users, group: "Administration", status: "ready" },
  { slug: "classes", title: "Classes & Institutions", description: "Institutions, classes and houses", icon: School, group: "Administration", status: "planned" },
  { slug: "academic-years", title: "Academic Years", description: "Define years and the current term", icon: CalendarRange, group: "Administration", status: "planned" },
  { slug: "islamic-studies", title: "Islamic Studies", description: "20% of the final SPR", icon: BookOpen, group: "SPR Categories", status: "planned", categoryCode: "islamic_studies" },
  { slug: "school-studies", title: "School Studies", description: "Academic school performance", icon: GraduationCap, group: "SPR Categories", status: "planned", categoryCode: "school_studies" },
  { slug: "qualification", title: "Qualification", description: "Certifications and qualifications", icon: Award, group: "SPR Categories", status: "planned", categoryCode: "qualification" },
  { slug: "creative-hub", title: "Creative Hub", description: "Arts, design and creative work", icon: Palette, group: "SPR Categories", status: "planned", categoryCode: "creative_hub" },
  { slug: "library-reading", title: "Library & Reading", description: "Reading logs and library engagement", icon: Library, group: "SPR Categories", status: "planned", categoryCode: "library_reading" },
  { slug: "literary-programmes", title: "Literary Programmes", description: "Writing, speech and literary events", icon: PenLine, group: "SPR Categories", status: "planned", categoryCode: "literary_programmes" },
  { slug: "programmes-competitions", title: "Programmes & Competitions", description: "Events and competition results", icon: Trophy, group: "SPR Categories", status: "planned", categoryCode: "programmes_competitions" },
  { slug: "dossier", title: "Student Dossier", description: "Individual performance reports", icon: FileText, group: "Reports & Scoring", status: "planned" },
  { slug: "matrix", title: "SPR Matrix", description: "Percentage calculation matrix", icon: Calculator, group: "Reports & Scoring", status: "planned" },
  { slug: "leaderboard", title: "Leaderboard", description: "Ranked SPR results", icon: Medal, group: "Reports & Scoring", status: "planned" },
  { slug: "weights", title: "Weight Management", description: "Category weights used in the SPR", icon: Scale, group: "Reports & Scoring", status: "ready" },
  { slug: "categories", title: "Categories & Records", description: "Assessment items and records", icon: Layers, group: "Reports & Scoring", status: "planned" },
];

export const MODULE_GROUPS = ["Overview", "Administration", "SPR Categories", "Reports & Scoring"] as const;

export function findModule(slug: string) {
  return MODULES.find((m) => m.slug === slug);
}
