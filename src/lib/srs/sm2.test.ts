import { describe, expect, it } from "vitest";

import { reviewFlashcard } from "./sm2";

const now = new Date("2026-05-31T12:00:00.000Z");

describe("reviewFlashcard", () => {
  it("resets forgotten cards to a one-day interval", () => {
    const result = reviewFlashcard(
      { intervalDays: 8, easeFactor: 2.5, repetitions: 3 },
      "forgot",
      now,
    );

    expect(result).toEqual({
      intervalDays: 1,
      easeFactor: 2.3,
      repetitions: 0,
      dueAt: new Date("2026-06-01T12:00:00.000Z"),
    });
  });

  it("keeps hard cards soon but preserves learning progress", () => {
    const result = reviewFlashcard(
      { intervalDays: 8, easeFactor: 2.5, repetitions: 3 },
      "hard",
      now,
    );

    expect(result).toEqual({
      intervalDays: 10,
      easeFactor: 2.35,
      repetitions: 4,
      dueAt: new Date("2026-06-10T12:00:00.000Z"),
    });
  });

  it("expands easy cards using ease factor", () => {
    const result = reviewFlashcard(
      { intervalDays: 8, easeFactor: 2.5, repetitions: 3 },
      "easy",
      now,
    );

    expect(result).toEqual({
      intervalDays: 20,
      easeFactor: 2.6,
      repetitions: 4,
      dueAt: new Date("2026-06-20T12:00:00.000Z"),
    });
  });
});
