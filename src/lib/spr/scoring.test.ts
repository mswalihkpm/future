import { describe, expect, it } from "vitest";
import {
  calculateExamScaledScore,
  calculateCompetitionPoints,
  calculateQualificationPoints,
  calculateCreativePoints,
  calculateLibraryReadingPoints,
  calculateKuthbkhanaPoints,
  calculateTotalSpr,
  calculateLeaderboardRanks,
  normalizeSprId,
  isValidSprId,
  generateNextSprId,
  isExactSprIdMatch,
  type LeaderboardEntry,
} from "./scoring";

describe("Authoritative SPR Scoring Engine", () => {
  describe("Academic Scaling", () => {
    it("scales Islamic Studies to actual max 100", () => {
      // 80/100 obtained = 80 points
      const score = calculateExamScaledScore({
        sumObtained: 80,
        sumMax: 100,
        actualMaxScore: 100,
      });
      expect(score).toBe(80.0);
    });

    it("scales School Studies with actual max 130", () => {
      // 90% in exam with actual max 130 = 117.00 points
      const score = calculateExamScaledScore({
        sumObtained: 90,
        sumMax: 100,
        actualMaxScore: 130,
      });
      expect(score).toBe(117.0);
    });

    it("handles zero maximum marks safely", () => {
      expect(
        calculateExamScaledScore({ sumObtained: 0, sumMax: 0, actualMaxScore: 100 })
      ).toBe(0);
    });

    it("clamps obtained marks if exceeding max marks", () => {
      expect(
        calculateExamScaledScore({ sumObtained: 120, sumMax: 100, actualMaxScore: 100 })
      ).toBe(100);
    });
  });

  describe("Programmes & Literary Competitions", () => {
    it("calculates District 1st Prize as 500 points (100 * 2.0 * 2.5)", () => {
      const points = calculateCompetitionPoints({
        baseScore: 100,
        prizePosition: "1st",
        level: "district",
      });
      expect(points).toBe(500.0);
    });

    it("calculates State 2nd Prize with base 75 (75 * 1.5 * 4.0 = 450)", () => {
      const points = calculateCompetitionPoints({
        baseScore: 75,
        prizePosition: "2nd",
        level: "state",
      });
      expect(points).toBe(450.0);
    });

    it("calculates International 1st Prize with default base (100 * 2.0 * 5.0 = 1000)", () => {
      const points = calculateCompetitionPoints({
        prizePosition: "1st",
        level: "international",
      });
      expect(points).toBe(1000.0);
    });

    it("calculates School 3rd Prize (50 * 1.0 * 1.0 = 50)", () => {
      const points = calculateCompetitionPoints({
        baseScore: 50,
        prizePosition: "3rd",
        level: "school",
      });
      expect(points).toBe(50.0);
    });
  });

  describe("Qualification Formula", () => {
    it("calculates base * subcategoryWeight * level * prize", () => {
      const points = calculateQualificationPoints({
        baseScore: 100,
        subcategoryWeight: 1.5,
        levelMultiplier: 2.0,
        prizeMultiplier: 1.5,
      });
      // 100 * 1.5 * 2.0 * 1.5 = 450
      expect(points).toBe(450.0);
    });
  });

  describe("Creative Hub", () => {
    it("calculates Research Paper in Journal (100 * 1.5 = 150)", () => {
      const points = calculateCreativePoints({
        form: "research_paper",
        media: "journal",
      });
      expect(points).toBe(150.0);
    });

    it("calculates Poem in Newspaper (50 * 1.5 = 75)", () => {
      const points = calculateCreativePoints({
        form: "poem",
        media: "newspaper",
      });
      expect(points).toBe(75.0);
    });

    it("respects direct score entry when provided", () => {
      const points = calculateCreativePoints({
        directScore: 85,
        form: "story",
      });
      expect(points).toBe(85.0);
    });
  });

  describe("Library & Classical Reading", () => {
    it("calculates Imthiyaaz full read with rate 1.5 per 10 pages", () => {
      // 200 pages full read = (200 / 10) * 1.5 = 30 points
      const points = calculateLibraryReadingPoints({
        totalPages: 200,
        mode: "full",
        ratePerTenPages: 1.5,
      });
      expect(points).toBe(30.0);
    });

    it("calculates Imthiyaaz half read as full / 2", () => {
      // 200 pages half read = ((200 / 10) * 1.5) / 2 = 15 points
      const points = calculateLibraryReadingPoints({
        totalPages: 200,
        mode: "half",
        ratePerTenPages: 1.5,
      });
      expect(points).toBe(15.0);
    });

    it("calculates Imthiyaaz custom page read and adds review points", () => {
      // 80 pages read out of 200 = (80 / 10) * 1.0 = 8 + 5 review = 13 points
      const points = calculateLibraryReadingPoints({
        totalPages: 200,
        pagesRead: 80,
        mode: "custom",
        ratePerTenPages: 1.0,
        reviewPoints: 5,
      });
      expect(points).toBe(13.0);
    });

    it("calculates Kuthbkhana Muthala points (Base * Subcategory Weight)", () => {
      // 100 * 1.5 = 150
      expect(calculateKuthbkhanaPoints(100, 1.5)).toBe(150.0);
    });
  });

  describe("Total Raw SPR Points (Unlimited)", () => {
    it("sums points across all categories without artificial 100% cap", () => {
      const categories = {
        islamic: 180.5,
        school: 245.0,
        qualification: 450.0,
        creative: 150.0,
        literary: 1200.0,
        competitions: 750.0,
        library: 225.5,
      };
      const total = calculateTotalSpr(categories);
      expect(total).toBe(3201.0);
      expect(total).toBeGreaterThan(100);
    });
  });

  describe("Leaderboard Ranking & Tie-breaking (1, 1, 3 style)", () => {
    const students: LeaderboardEntry[] = [
      {
        studentId: "1",
        sprId: "SPR0001",
        fullName: "Zayd",
        earnedPoints: 500,
        recordCount: 5,
      },
      {
        studentId: "2",
        sprId: "SPR0002",
        fullName: "Ali",
        earnedPoints: 500,
        recordCount: 5,
      },
      {
        studentId: "3",
        sprId: "SPR0003",
        fullName: "Bilal",
        earnedPoints: 400,
        recordCount: 4,
      },
      {
        studentId: "4",
        sprId: "SPR0004",
        fullName: "Umar",
        earnedPoints: 0,
        recordCount: 0,
      },
    ];

    it("applies standard competition tie rules (1, 1, 3)", () => {
      const ranked = calculateLeaderboardRanks(students);

      // Ali and Zayd tied with 500 pts and 5 records
      // Ali comes first alphabetically, but both have Rank 1
      expect(ranked[0].fullName).toBe("Ali");
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].tied).toBe(true);
      expect(ranked[0].tiedCount).toBe(2);

      expect(ranked[1].fullName).toBe("Zayd");
      expect(ranked[1].rank).toBe(1);
      expect(ranked[1].tied).toBe(true);

      // Bilal skips Rank 2 and receives Rank 3
      expect(ranked[2].fullName).toBe("Bilal");
      expect(ranked[2].rank).toBe(3);
      expect(ranked[2].tied).toBe(false);

      // Umar with 0 points is included on overall leaderboard at rank 4
      expect(ranked[3].fullName).toBe("Umar");
      expect(ranked[3].rank).toBe(4);
    });

    it("excludes 0-point students on category-specific leaderboards", () => {
      const ranked = calculateLeaderboardRanks(students, { isCategoryLeaderboard: true });
      expect(ranked.some((s) => s.fullName === "Umar")).toBe(false);
      expect(ranked.length).toBe(3);
    });
  });

  describe("SPR Student ID Invariance & Sync Matching", () => {
    it("validates SPR ID format strictly", () => {
      expect(isValidSprId("SPR0001")).toBe(true);
      expect(isValidSprId("spr0115")).toBe(true);
      expect(isValidSprId("SPR10000")).toBe(true);
      expect(isValidSprId("SPR12")).toBe(false); // less than 4 digits
      expect(isValidSprId("STUDENT0001")).toBe(false);
      expect(isValidSprId("")).toBe(false);
    });

    it("normalizes SPR ID correctly", () => {
      expect(normalizeSprId("  spr0042  ")).toBe("SPR0042");
    });

    it("generates sequential SPR ID with 4-digit zero padding", () => {
      expect(generateNextSprId([])).toBe("SPR0001");
      expect(generateNextSprId(["SPR0001", "SPR0002"])).toBe("SPR0003");
      expect(generateNextSprId(["SPR0001", "SPR0115"])).toBe("SPR0116");
    });

    it("matches only exact SPR IDs, rejecting fuzzy/guessed IDs", () => {
      expect(isExactSprIdMatch("SPR0001", "spr0001")).toBe(true);
      expect(isExactSprIdMatch("SPR0001", "SPR0002")).toBe(false);
      expect(isExactSprIdMatch("SPR0001", "SPR-0001")).toBe(false);
      expect(isExactSprIdMatch("SPR0001", "0001")).toBe(false);
    });
  });
});
