import { describe, expect, it } from "vitest";
import { OTHER_CATEGORY_WEIGHT, calculateSpr, ISLAMIC_STUDIES_WEIGHT } from "./calculation";

const cats = [
  { id: "islamic", weight: ISLAMIC_STUDIES_WEIGHT },
  ...Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, weight: OTHER_CATEGORY_WEIGHT })),
];

describe("calculateSpr", () => {
  it("is exactly 100 for perfect scores", () => {
    expect(
      calculateSpr(
        cats,
        cats.map((c) => ({ categoryId: c.id, normalizedScore: 1 })),
      ),
    ).toBe(100);
  });
  it("weights Islamic Studies at 20%", () => {
    expect(calculateSpr(cats, [{ categoryId: "islamic", normalizedScore: 1 }])).toBeCloseTo(20, 10);
  });
  it("is 0 with no scores", () => {
    expect(calculateSpr(cats, [])).toBe(0);
  });
});
