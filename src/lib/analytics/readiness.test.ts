import { describe, expect, it } from "vitest";

import { calculateReadiness } from "./readiness";

describe("calculateReadiness", () => {
  it("rolls question results up by objective and domain", () => {
    const readiness = calculateReadiness(
      [
        { id: "obj-1", domain: "Basics", objective: "Describe repositories" },
        { id: "obj-2", domain: "Actions", objective: "Describe workflows" },
      ],
      [
        { objectiveId: "obj-1", score: 1, maxScore: 1 },
        { objectiveId: "obj-1", score: 0, maxScore: 1 },
        { objectiveId: "obj-2", score: 0.5, maxScore: 1 },
      ],
    );

    expect(readiness.overallScore).toBe(50);
    expect(readiness.domains).toEqual([
      { domain: "Basics", score: 50, correct: 1, total: 2 },
      { domain: "Actions", score: 50, correct: 0.5, total: 1 },
    ]);
    expect(readiness.weakObjectives).toEqual([
      {
        objectiveId: "obj-1",
        domain: "Basics",
        objective: "Describe repositories",
        score: 50,
      },
      {
        objectiveId: "obj-2",
        domain: "Actions",
        objective: "Describe workflows",
        score: 50,
      },
    ]);
    expect(readiness.recommendation).toBe(
      "Focus on Basics and Actions before taking the exam.",
    );
  });
});
