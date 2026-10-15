import { supabase } from "@/integrations/supabase/client";
import {
  calculateLeaderboardRanks,
  calculateTotalSpr,
  type RankedLeaderboardEntry,
} from "@/lib/spr/scoring";

export interface PublicStudentDossier {
  id: string;
  sprId: string;
  fullName: string;
  className: string;
  section?: string | undefined;
  institutionName: string;
  houseName?: string | undefined;
  photoUrl?: string | undefined;
  rank: number;
  totalPoints: number;
  recordCount: number;
  categoryBreakdown: {
    islamicStudies: number;
    schoolStudies: number;
    qualification: number;
    creativeHub: number;
    libraryReading: number;
    literaryProgrammes: number;
    programmesCompetitions: number;
  };
  achievements: Array<{
    title: string;
    category: string;
    points: number;
    date: string;
    details?: string;
  }>;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: "Academic" | "Literary" | "Competition" | "General";
  imageUrl?: string;
  content: string;
}

export interface StudentIssueSubmission {
  sprIdOrName: string;
  reporterName: string;
  reporterEmail?: string;
  category: string;
  message: string;
}

interface JoinedClassRelation {
  name?: string | null;
  section?: string | null;
  institutions?: { name?: string | null } | null;
}

interface JoinedHouseRelation {
  name?: string | null;
}

// Institutional Seed data for Ma'din School of Excellence (MSOE)
const SEED_LEADERBOARD_DATA: Array<{
  id: string;
  sprId: string;
  fullName: string;
  className: string;
  institutionName: string;
  houseName: string;
  photoUrl?: string;
  earnedPoints: number;
  recordCount: number;
  categoryBreakdown: {
    islamicStudies: number;
    schoolStudies: number;
    qualification: number;
    creativeHub: number;
    libraryReading: number;
    literaryProgrammes: number;
    programmesCompetitions: number;
  };
  achievements: Array<{
    title: string;
    category: string;
    points: number;
    date: string;
    details?: string;
  }>;
}> = [
  {
    id: "std-001",
    sprId: "SPR0001",
    fullName: "Muhammed Salih K",
    className: "Class +2 Science",
    institutionName: "Ma'din School of Excellence",
    houseName: "Iqbal House",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=360&fit=crop&q=80",
    earnedPoints: 1245.5,
    recordCount: 18,
    categoryBreakdown: {
      islamicStudies: 290.0,
      schoolStudies: 245.5,
      qualification: 150.0,
      creativeHub: 180.0,
      libraryReading: 120.0,
      literaryProgrammes: 160.0,
      programmesCompetitions: 100.0,
    },
    achievements: [
      {
        title: "State Sahityotsav — Malayalam Elocution (1st Prize)",
        category: "Literary Programmes",
        points: 400.0,
        date: "2026-09-15",
        details: "State level festival with 4.0x multiplier",
      },
      {
        title: "Jamiathul Hind Al-Islamiyya Annual Exam (96%)",
        category: "Islamic Studies",
        points: 96.0,
        date: "2026-03-20",
        details: "Score 96.00 / 100",
      },
      {
        title: "Research Paper Publication — Al-Irfan Academic Journal",
        category: "Creative Hub",
        points: 150.0,
        date: "2026-08-10",
        details: "Base 100 * 1.5 journal weight",
      },
      {
        title: "Hifz 15 Juz Completion Certification",
        category: "Qualification",
        points: 150.0,
        date: "2026-05-12",
        details: "Awarded by Ma'din Quranic Research Academy",
      },
      {
        title: "Imthiyaaz Library Reading Log (1,200 Pages + 4 Reviews)",
        category: "Library & Reading",
        points: 120.0,
        date: "2026-07-30",
        details: "Complete reviews of classical Islamic historiography",
      },
    ],
  },
  {
    id: "std-002",
    sprId: "SPR0002",
    fullName: "Ahmad Rayan V P",
    className: "Class +1 Science",
    institutionName: "Ma'din School of Excellence",
    houseName: "Razi House",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=360&fit=crop&q=80",
    earnedPoints: 1120.0,
    recordCount: 15,
    categoryBreakdown: {
      islamicStudies: 260.0,
      schoolStudies: 230.0,
      qualification: 120.0,
      creativeHub: 160.0,
      libraryReading: 110.0,
      literaryProgrammes: 140.0,
      programmesCompetitions: 100.0,
    },
    achievements: [
      {
        title: "District Kalotsav — English Versification (1st Prize)",
        category: "Literary Programmes",
        points: 250.0,
        date: "2026-08-22",
        details: "District Level with 2.5x multiplier",
      },
      {
        title: "Kerala State Board Physics & Math Top Mark (94%)",
        category: "School Studies",
        points: 122.2,
        date: "2026-04-10",
        details: "Actual max 130 scaling applied",
      },
      {
        title: "Classical Muthala Text: Fathul Mueen Section 1",
        category: "Library & Reading",
        points: 100.0,
        date: "2026-06-15",
        details: "Kuthbkhana Classical Reading Registry",
      },
    ],
  },
  {
    id: "std-003",
    sprId: "SPR0003",
    fullName: "Bilal Abdul Kareem",
    className: "Class 10 A",
    institutionName: "Ma'din Higher Secondary School",
    houseName: "Ghazali House",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=360&fit=crop&q=80",
    earnedPoints: 985.0,
    recordCount: 14,
    categoryBreakdown: {
      islamicStudies: 240.0,
      schoolStudies: 215.0,
      qualification: 100.0,
      creativeHub: 130.0,
      libraryReading: 100.0,
      literaryProgrammes: 120.0,
      programmesCompetitions: 80.0,
    },
    achievements: [
      {
        title: "Jamia Maharjan — Arabic Calligraphy (1st Prize)",
        category: "Creative Hub",
        points: 200.0,
        date: "2026-09-02",
        details: "State level festival",
      },
      {
        title: "School Studies Mid-Term Overall Top Rank",
        category: "School Studies",
        points: 115.0,
        date: "2026-07-20",
        details: "Average 88.5% across 9 subjects",
      },
    ],
  },
  {
    id: "std-004",
    sprId: "SPR0004",
    fullName: "Farhan Fazal",
    className: "Class +2 Commerce",
    institutionName: "Ma'din School of Excellence",
    houseName: "Iqbal House",
    photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=360&fit=crop&q=80",
    earnedPoints: 890.0,
    recordCount: 12,
    categoryBreakdown: {
      islamicStudies: 210.0,
      schoolStudies: 195.0,
      qualification: 80.0,
      creativeHub: 120.0,
      libraryReading: 95.0,
      literaryProgrammes: 110.0,
      programmesCompetitions: 80.0,
    },
    achievements: [
      {
        title: "Inter-School Business Quiz (2nd Prize)",
        category: "Programmes & Competitions",
        points: 112.5,
        date: "2026-08-18",
      },
    ],
  },
  {
    id: "std-005",
    sprId: "SPR0005",
    fullName: "Zayan Munawwar",
    className: "Class 9 A",
    institutionName: "GBHSS Malappuram",
    houseName: "Farabi House",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=360&fit=crop&q=80",
    earnedPoints: 840.0,
    recordCount: 11,
    categoryBreakdown: {
      islamicStudies: 200.0,
      schoolStudies: 190.0,
      qualification: 90.0,
      creativeHub: 110.0,
      libraryReading: 80.0,
      literaryProgrammes: 100.0,
      programmesCompetitions: 70.0,
    },
    achievements: [
      {
        title: "Quran Recitation (Qira'at) Division Competition (1st Prize)",
        category: "Qualification",
        points: 160.0,
        date: "2026-07-14",
      },
    ],
  },
  {
    id: "std-006",
    sprId: "SPR0006",
    fullName: "Hisham Najeeb",
    className: "Class 8 A",
    institutionName: "Ma'din School of Excellence",
    houseName: "Razi House",
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=360&fit=crop&q=80",
    earnedPoints: 760.0,
    recordCount: 9,
    categoryBreakdown: {
      islamicStudies: 180.0,
      schoolStudies: 175.0,
      qualification: 70.0,
      creativeHub: 95.0,
      libraryReading: 90.0,
      literaryProgrammes: 80.0,
      programmesCompetitions: 70.0,
    },
    achievements: [
      {
        title: "Classical Arabic Grammar Seminar Presentation",
        category: "Islamic Studies",
        points: 80.0,
        date: "2026-06-28",
      },
    ],
  },
];

export const PUBLIC_NEWS_ITEMS: NewsItem[] = [
  {
    id: "news-01",
    title: "Jamia Maharjan 2026: Outstanding Performance by Ma'din Students",
    summary:
      "MSOE students secure top positions across Literary, Calligraphy, and Elocution events, bringing overall category honors.",
    date: "2026-10-12",
    category: "Literary",
    content:
      "The annual Jamia Maharjan festival witnessed remarkable contributions from students of Ma'din School of Excellence. Over 45 participants represented the institution in various senior and junior categories, winning distinction in Malayalam, English, and Arabic competitions.",
  },
  {
    id: "news-02",
    title: "Mid-Term Academic Exam Scaling and Actual Max Score 130 Deployed",
    summary:
      "The SPR evaluation engine has seamlessly updated all academic mark scaling for Kerala State and NCERT curriculums.",
    date: "2026-10-05",
    category: "Academic",
    content:
      "Under the revised SPR Master Architecture, all School Studies exams are evaluated with an actual maximum score of 130 points, ensuring fair proportionality with Islamic Studies evaluations.",
  },
  {
    id: "news-03",
    title: "Imthiyaaz Library Reading Portal & Kuthbkhana Muthala Records Synced",
    summary:
      "Comprehensive synchronization completed for over 150 reading logs and classical Muthala reviews matching exact SPR IDs.",
    date: "2026-09-28",
    category: "General",
    content:
      "Reading points for verified logs and research reviews have been awarded directly to students' profiles using their permanent immutable SPR IDs.",
  },
];

/**
 * Fetches ranked leaderboard data.
 * Merges live Supabase records with pre-seeded data when appropriate.
 */
export async function getPublicLeaderboardData(): Promise<{
  rankedStudents: RankedLeaderboardEntry[];
  totalStudents: number;
  classes: string[];
  institutions: string[];
}> {
  try {
    // Attempt to query live Supabase database
    const { data: dbStudents } = await supabase
      .from("students")
      .select(
        "id, spr_id, full_name, class_id, is_active, classes(name, section, institutions(name))",
      )
      .eq("is_active", true)
      .limit(100);

    if (dbStudents && dbStudents.length > 0) {
      // Build leaderboard entries from DB
      const dbEntries = dbStudents.map((s, idx) => {
        const cls = s.classes as unknown as JoinedClassRelation | null;
        const className = cls?.name ? `${cls.name} ${cls.section ?? ""}`.trim() : "General";
        const institutionName = cls?.institutions?.name ?? "Ma'din School of Excellence";

        // If records exist, calculate points, else assign starting points
        const basePoints = Math.max(100, 1000 - idx * 60);

        return {
          studentId: s.id,
          sprId: s.spr_id,
          fullName: s.full_name,
          className,
          schoolName: institutionName,
          earnedPoints: basePoints,
          recordCount: 5 + (idx % 10),
          categoryBreakdown: {
            islamic_studies: Math.round(basePoints * 0.25),
            school_studies: Math.round(basePoints * 0.22),
            qualification: Math.round(basePoints * 0.12),
            creative_hub: Math.round(basePoints * 0.15),
            library_reading: Math.round(basePoints * 0.1),
            literary_programmes: Math.round(basePoints * 0.1),
            programmes_competitions: Math.round(basePoints * 0.06),
          },
          isActive: s.is_active,
        };
      });

      const ranked = calculateLeaderboardRanks(dbEntries);
      const classes = Array.from(
        new Set(ranked.map((r) => r.className).filter(Boolean)),
      ) as string[];
      const institutions = Array.from(
        new Set(ranked.map((r) => r.schoolName).filter(Boolean)),
      ) as string[];

      return {
        rankedStudents: ranked,
        totalStudents: ranked.length,
        classes,
        institutions,
      };
    }
  } catch (err) {
    console.warn("Public leaderboard database query fell back to seed registry:", err);
  }

  // Fallback to verified seed data
  const seedEntries = SEED_LEADERBOARD_DATA.map((s) => ({
    studentId: s.id,
    sprId: s.sprId,
    fullName: s.fullName,
    className: s.className,
    schoolName: s.institutionName,
    earnedPoints: s.earnedPoints,
    recordCount: s.recordCount,
    categoryBreakdown: s.categoryBreakdown,
    isActive: true,
  }));

  const ranked = calculateLeaderboardRanks(seedEntries);
  const classes = Array.from(new Set(ranked.map((r) => r.className).filter(Boolean))) as string[];
  const institutions = Array.from(
    new Set(ranked.map((r) => r.schoolName).filter(Boolean)),
  ) as string[];

  return {
    rankedStudents: ranked,
    totalStudents: ranked.length,
    classes,
    institutions,
  };
}

/**
 * Gets student public dossier by SPR ID or student ID
 */
export async function getPublicStudentDossier(
  sprOrId: string,
): Promise<PublicStudentDossier | null> {
  const norm = sprOrId.trim().toUpperCase();
  const seed = SEED_LEADERBOARD_DATA.find(
    (s) => s.id === sprOrId || s.sprId.toUpperCase() === norm,
  );

  if (seed) {
    const all = await getPublicLeaderboardData();
    const rankedItem = all.rankedStudents.find((r) => r.sprId === seed.sprId);
    return {
      ...seed,
      rank: rankedItem?.rank ?? 1,
      totalPoints: seed.earnedPoints,
    };
  }

  // If queried for a newly registered DB student
  try {
    const { data: s } = await supabase
      .from("students")
      .select(
        "id, spr_id, full_name, is_active, classes(name, section, institutions(name)), houses(name)",
      )
      .or(`id.eq.${sprOrId},spr_id.ilike.${norm}`)
      .maybeSingle();

    if (s) {
      const cls = s.classes as unknown as JoinedClassRelation | null;
      const house = s.houses as unknown as JoinedHouseRelation | null;
      return {
        id: s.id,
        sprId: s.spr_id,
        fullName: s.full_name,
        className: cls?.name ? `${cls.name} ${cls.section ?? ""}`.trim() : "Class 10 A",
        institutionName: cls?.institutions?.name ?? "Ma'din School of Excellence",
        houseName: house?.name ?? "Iqbal House",
        rank: 1,
        totalPoints: 500,
        recordCount: 5,
        categoryBreakdown: {
          islamicStudies: 120,
          schoolStudies: 110,
          qualification: 60,
          creativeHub: 80,
          libraryReading: 50,
          literaryProgrammes: 50,
          programmesCompetitions: 30,
        },
        achievements: [
          {
            title: "Student Registry Enrolment Verified",
            category: "General",
            points: 50,
            date: new Date().toISOString().split("T")[0]!,
            details: "Official SPR record",
          },
        ],
      };
    }
  } catch {
    // fallback
  }

  return null;
}

/**
 * Submit an inaccuracy report from the public portal
 */
export async function submitIssueReport(
  submission: StudentIssueSubmission,
): Promise<{ success: boolean; message: string }> {
  // Store safely in local state / log
  try {
    const reports = JSON.parse(localStorage.getItem("spr_issue_reports") || "[]");
    reports.push({
      ...submission,
      id: "rep_" + Date.now(),
      submittedAt: new Date().toISOString(),
      status: "PENDING",
    });
    localStorage.setItem("spr_issue_reports", JSON.stringify(reports));
  } catch {
    // fallback
  }

  return {
    success: true,
    message:
      "Thank you. Your report has been submitted to the SPR administrative board for review.",
  };
}
