/**
 * Pure SPR calculation logic. Mirrors the database views `student_category_scores`
 * and `student_spr` so the UI and the database agree.
 *
 * - Category score: sum(score) / sum(max_score), in [0, 1].
 * - Final SPR: 100 * Σ(wᵢ·sᵢ) / Σwᵢ — dividing by the actual weight total
 *   guarantees a maximum of exactly 100% even if stored weights are not exact.
 */

export interface WeightedCategory {
  id: string;
  weight: number;
}

export interface CategoryScore {
  categoryId: string;
  normalizedScore: number; // 0..1
}

export const ISLAMIC_STUDIES_WEIGHT = 20;
export const OTHER_CATEGORY_COUNT = 6;
/** Exact share for each non-Islamic category (80 / 6). */
export const OTHER_CATEGORY_WEIGHT = (100 - ISLAMIC_STUDIES_WEIGHT) / OTHER_CATEGORY_COUNT;

export function normalizeScore(score: number, maxScore: number): number {
  if (!(maxScore > 0)) return 0;
  return Math.min(Math.max(score / maxScore, 0), 1);
}

export function calculateSpr(categories: WeightedCategory[], scores: CategoryScore[]): number {
  const total = categories.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return 0;
  const byId = new Map(scores.map((s) => [s.categoryId, s.normalizedScore]));
  const weighted = categories.reduce((sum, c) => sum + c.weight * (byId.get(c.id) ?? 0), 0);
  return (100 * weighted) / total;
}

/** Share of the final SPR a category represents, as a display percentage. */
export function effectiveShare(weight: number, totalWeight: number): number {
  return totalWeight > 0 ? (100 * weight) / totalWeight : 0;
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}
