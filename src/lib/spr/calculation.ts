/**
 * SPR Calculation Module
 * 
 * Re-exports the authoritative unlimited numerical points scoring engine
 * from `./scoring`, while providing backward-compatible adapters.
 */

export * from "./scoring";

// ==========================================
// Compatibility Adapters for Legacy References
// ==========================================

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
export const OTHER_CATEGORY_WEIGHT = (100 - ISLAMIC_STUDIES_WEIGHT) / OTHER_CATEGORY_COUNT;

export function normalizeScore(score: number, maxScore: number): number {
  if (!(maxScore > 0)) return 0;
  return Math.min(Math.max(score / maxScore, 0), 1);
}

/** Legacy percentage adapter retained for UI transition */
export function calculateSpr(categories: WeightedCategory[], scores: CategoryScore[]): number {
  const total = categories.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return 0;
  const byId = new Map(scores.map((s) => [s.categoryId, s.normalizedScore]));
  const weighted = categories.reduce((sum, c) => sum + c.weight * (byId.get(c.id) ?? 0), 0);
  return (100 * weighted) / total;
}

/** Share of category weight as a display percentage */
export function effectiveShare(weight: number, totalWeight: number): number {
  return totalWeight > 0 ? (100 * weight) / totalWeight : 0;
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}
