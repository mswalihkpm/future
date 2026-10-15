/**
 * Authoritative Scoring & Performance Engine for Madin School of Excellence (SPR)
 * 
 * Rules:
 * 1. Scoring model: UNLIMITED NUMERICAL POINTS (Total = sum of earned category points).
 * 2. Standard Competition Ranking ("1, 1, 3" tie rules with skipped ranks).
 * 3. Category leaderboards exclude 0-point students; Master leaderboard includes active 0-point students.
 * 4. Exact SPR ID handling (/^SPR\d{4,}$/i, permanent and immutable).
 */

// ==========================================
// 1. FESTIVAL & COMPETITION CONSTANTS
// ==========================================

export type PrizePosition = "1st" | "2nd" | "3rd" | "participation" | "other";

export const PRIZE_MULTIPLIERS: Record<PrizePosition, number> = {
  "1st": 2.0,
  "2nd": 1.5,
  "3rd": 1.0,
  "participation": 1.0,
  "other": 1.0,
};

export const DEFAULT_PRIZE_BASE_SCORES: Record<PrizePosition, number> = {
  "1st": 100,
  "2nd": 75,
  "3rd": 50,
  "participation": 25,
  "other": 25,
};

export type FestivalLevel =
  | "campus"
  | "school"
  | "division"
  | "district"
  | "daeera"
  | "state"
  | "national"
  | "international";

export const FESTIVAL_LEVEL_MULTIPLIERS: Record<FestivalLevel, number> = {
  campus: 1.0,
  school: 1.0,
  division: 2.0, // Sub-district / Division / Kulliya
  district: 2.5,
  daeera: 3.0,
  state: 4.0, // State / Jamia
  national: 4.5,
  international: 5.0,
};

// ==========================================
// 2. CREATIVE HUB CONSTANTS
// ==========================================

export type CreativeForm =
  | "research_paper"
  | "story"
  | "article"
  | "poem"
  | "book_review"
  | "response"
  | "letter"
  | "others";

export const CREATIVE_FORM_BASE_SCORES: Record<CreativeForm, number> = {
  research_paper: 100,
  story: 75,
  article: 50,
  poem: 50,
  book_review: 50,
  response: 40,
  letter: 30,
  others: 30,
};

export type PublishedMedia =
  | "newspaper"
  | "magazine"
  | "wall_magazine"
  | "digital_portal"
  | "journal";

export const PUBLISHED_MEDIA_WEIGHTS: Record<PublishedMedia, number> = {
  newspaper: 1.5,
  magazine: 1.25,
  journal: 1.5,
  digital_portal: 1.0,
  wall_magazine: 0.8,
};

// ==========================================
// 3. ACADEMIC SCALING ENGINE
// ==========================================

export interface ExamScalingInput {
  sumObtained: number;
  sumMax: number;
  actualMaxScore: number; // e.g. 100 for Islamic Studies, 130 for School Studies
}

/**
 * Calculates academic exam scaled score:
 * Assessment Percentage = (sum obtained / sum max) * 100
 * Scaled Score = (Assessment Percentage / 100) * actualMaxScore
 * Example: 90% in exam with actual max 130 = 117.00 points
 */
export function calculateExamScaledScore({
  sumObtained,
  sumMax,
  actualMaxScore,
}: ExamScalingInput): number {
  if (sumMax <= 0 || sumObtained < 0) return 0;
  const clampedObtained = Math.min(sumObtained, sumMax);
  const percentage = (clampedObtained / sumMax) * 100;
  const scaled = (percentage / 100) * actualMaxScore;
  return Number(scaled.toFixed(2));
}

// ==========================================
// 4. PROGRAMMES & LITERARY COMPETITIONS
// ==========================================

export interface CompetitionScoreInput {
  baseScore?: number | undefined;
  prizePosition: PrizePosition;
  level: FestivalLevel;
  customPrizeMultiplier?: number | undefined;
  customLevelMultiplier?: number | undefined;
}

/**
 * Earned Points = Base Score * Prize Multiplier * Level Multiplier
 * Example: District 1st Prize = 100 * 2.0 * 2.50 = 500 points
 */
export function calculateCompetitionPoints({
  baseScore,
  prizePosition,
  level,
  customPrizeMultiplier,
  customLevelMultiplier,
}: CompetitionScoreInput): number {
  const base = baseScore ?? DEFAULT_PRIZE_BASE_SCORES[prizePosition] ?? 50;
  const prizeMult = customPrizeMultiplier ?? PRIZE_MULTIPLIERS[prizePosition] ?? 1.0;
  const levelMult = customLevelMultiplier ?? FESTIVAL_LEVEL_MULTIPLIERS[level] ?? 1.0;

  const points = base * prizeMult * levelMult;
  return Number(points.toFixed(2));
}

// ==========================================
// 5. QUALIFICATION FORMULA
// ==========================================

export interface QualificationScoreInput {
  baseScore: number;
  subcategoryWeight?: number | undefined;
  levelMultiplier?: number | undefined;
  prizeMultiplier?: number | undefined;
}

/**
 * Earned Points = Base Score * Subcategory Weight * Level Multiplier * Prize Multiplier
 */
export function calculateQualificationPoints({
  baseScore,
  subcategoryWeight = 1.0,
  levelMultiplier = 1.0,
  prizeMultiplier = 1.0,
}: QualificationScoreInput): number {
  const points = baseScore * subcategoryWeight * levelMultiplier * prizeMultiplier;
  return Number(points.toFixed(2));
}

// ==========================================
// 6. CREATIVE HUB FORMULA
// ==========================================

export interface CreativeHubScoreInput {
  directScore?: number | undefined;
  form?: CreativeForm | undefined;
  media?: PublishedMedia | undefined;
  customFormBase?: number | undefined;
  customMediaWeight?: number | undefined;
}

/**
 * Earned Points = Direct Points OR (Form Base Score * Media Weight)
 */
export function calculateCreativePoints({
  directScore,
  form,
  media,
  customFormBase,
  customMediaWeight,
}: CreativeHubScoreInput): number {
  if (directScore !== undefined && directScore !== null) {
    return Number(directScore.toFixed(2));
  }
  const base = customFormBase ?? (form ? CREATIVE_FORM_BASE_SCORES[form] ?? 50 : 50);
  const weight = customMediaWeight ?? (media ? PUBLISHED_MEDIA_WEIGHTS[media] ?? 1.0 : 1.0);
  return Number((base * weight).toFixed(2));
}

// ==========================================
// 7. LIBRARY & KUTHBKHANA FORMULAS
// ==========================================

export type LibraryReadingMode = "full" | "half" | "custom";

export interface LibraryReadingScoreInput {
  totalPages: number;
  pagesRead?: number | undefined;
  mode: LibraryReadingMode;
  ratePerTenPages: number; // Configured library rate (e.g. 1.0 per 10 pages)
  reviewPoints?: number | undefined;
}

/**
 * Imthiyaaz Library reading rules:
 * Full read: (Pages / 10) * Rate
 * Half read: Full Points / 2
 * Custom read: (Pages Read / 10) * Rate
 * Review points added directly.
 */
export function calculateLibraryReadingPoints({
  totalPages,
  pagesRead,
  mode,
  ratePerTenPages,
  reviewPoints = 0,
}: LibraryReadingScoreInput): number {
  if (ratePerTenPages <= 0) return reviewPoints;

  let pagePoints = 0;
  if (mode === "full") {
    pagePoints = (totalPages / 10) * ratePerTenPages;
  } else if (mode === "half") {
    pagePoints = ((totalPages / 10) * ratePerTenPages) / 2;
  } else if (mode === "custom") {
    const read = Math.min(pagesRead ?? 0, totalPages);
    pagePoints = (read / 10) * ratePerTenPages;
  }

  return Number((pagePoints + reviewPoints).toFixed(2));
}

/**
 * Kuthbkhana Classical Reading:
 * Muthala (classical study) or Point Picking (research/thesis)
 * Earned Points = Base Score * Subcategory Weight
 */
export function calculateKuthbkhanaPoints(baseScore: number, subcategoryWeight = 1.0): number {
  return Number((baseScore * subcategoryWeight).toFixed(2));
}

// ==========================================
// 8. OVERALL UNLIMITED SPR POINTS
// ==========================================

/**
 * Overall SPR: Total SPR Points = sum of earned points across all active categories.
 * Points are unlimited and NOT capped at 100%.
 */
export function calculateTotalSpr(categoryScores: number[] | Record<string, number>): number {
  const values = Array.isArray(categoryScores)
    ? categoryScores
    : Object.values(categoryScores);
  const total = values.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
  return Number(total.toFixed(2));
}

// ==========================================
// 9. LEADERBOARD & TIE-BREAKING ENGINE
// ==========================================

export interface LeaderboardEntry {
  studentId: string;
  sprId: string;
  fullName: string;
  className?: string | undefined;
  schoolName?: string | undefined;
  earnedPoints: number;
  recordCount: number;
  categoryBreakdown?: Record<string, number> | undefined;
  isActive?: boolean | undefined;
}

export interface RankedLeaderboardEntry extends LeaderboardEntry {
  rank: number;
  tied: boolean;
  tiedCount: number;
}

/**
 * Standard Competition Ranking ("1, 1, 3" style):
 * - Sort: earnedPoints DESC, recordCount DESC, fullName ASC
 * - Ties share the exact same rank
 * - Subsequent rank skips by tiedCount
 * - Zero-point rule:
 *     Category leaderboards exclude students with 0 points
 *     Master leaderboard includes active students with 0 points
 */
export function calculateLeaderboardRanks(
  entries: LeaderboardEntry[],
  options?: { isCategoryLeaderboard?: boolean }
): RankedLeaderboardEntry[] {
  const isCategory = options?.isCategoryLeaderboard ?? false;

  // Filter based on zero-point rule
  let filtered = entries.filter((e) => (e.isActive ?? true));
  if (isCategory) {
    filtered = filtered.filter((e) => e.earnedPoints > 0);
  }

  // Deterministic multi-tier sort:
  // 1. Points descending
  // 2. Records count descending
  // 3. Name alphabetically ascending (case-insensitive)
  const sorted = [...filtered].sort((a, b) => {
    if (b.earnedPoints !== a.earnedPoints) {
      return b.earnedPoints - a.earnedPoints;
    }
    if (b.recordCount !== a.recordCount) {
      return b.recordCount - a.recordCount;
    }
    return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
  });

  const ranked: RankedLeaderboardEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (!current) continue;

    // Determine how many students tie with this exact score and record count
    let tieCount = 1;
    for (let j = i + 1; j < sorted.length; j++) {
      const next = sorted[j];
      if (
        next &&
        next.earnedPoints === current.earnedPoints &&
        next.recordCount === current.recordCount
      ) {
        tieCount++;
      } else {
        break;
      }
    }

    const isTied = tieCount > 1;

    // Assign rank to all tied entries
    for (let k = 0; k < tieCount; k++) {
      const item = sorted[i + k];
      if (item) {
        ranked.push({
          ...item,
          rank: currentRank,
          tied: isTied,
          tiedCount: isTied ? tieCount : 1,
        });
      }
    }

    // Skip to next distinct group, incrementing rank by tie count
    i += tieCount - 1;
    currentRank += tieCount;
  }

  return ranked;
}

// ==========================================
// 10. SPR STUDENT ID INVARIANCE & GENERATION
// ==========================================

export const SPR_ID_REGEX = /^SPR\d{4,}$/i;

export function normalizeSprId(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSprId(id: string): boolean {
  return SPR_ID_REGEX.test(id.trim());
}

/**
 * Sequential SPR ID generator:
 * Finds highest numeric suffix and returns SPR + zero-padded (min 4 digits).
 * e.g., [] -> SPR0001, ['SPR0001', 'SPR0115'] -> SPR0116.
 */
export function generateNextSprId(existingIds: string[]): string {
  let maxNum = 0;
  for (const id of existingIds) {
    if (!id) continue;
    const normalized = normalizeSprId(id);
    const match = normalized.match(/^SPR(\d+)$/);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  const padded = nextNum.toString().padStart(4, "0");
  return `SPR${padded}`;
}

/**
 * Exact match rule for cross-system syncing (e.g. Imthiyaaz Library)
 * Disallows fuzzy or guessed matching.
 */
export function isExactSprIdMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return normalizeSprId(a) === normalizeSprId(b);
}

// ==========================================
// 11. FORMATTING & DISPLAY HELPERS
// ==========================================

export function formatPoints(points: number): string {
  return points.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
