import { describe, expect, it } from "vitest";

import { calculateReadiness } from "@/lib/analytics/readiness";
import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { SourceChunk } from "@/lib/types";

import { buildMockAssessment, buildMockFlashcards, buildRemediationPacks } from "./mock";

const objectives: ObjectiveWithId[] = [
  {
    id: "obj-1",
    domain: "Basics",
    objective: "Describe repositories",
  },
  {
    id: "obj-2",
    domain: "Actions",
    objective: "Describe workflows",
  },
];

const chunks: SourceChunk[] = [
  {
    url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
    title: "Understanding GitHub Actions",
    headingPath: ["Understanding GitHub Actions", "Workflows"],
    content: "A workflow is a configurable automated process that runs one or more jobs.",
  },
];

describe("buildMockAssessment", () => {
  it("creates 50 cited multiple-choice questions without flashcards", () => {
    const assessment = buildMockAssessment(objectives, chunks);

    expect(assessment.questions).toHaveLength(50);
    expect(assessment.questions.every((question) => question.type === "multiple_choice")).toBe(true);
    expect(assessment.questions.every((question) => question.citations.length > 0)).toBe(true);
    expect(assessment.flashcards).toEqual([]);
  });
});

describe("buildMockFlashcards", () => {
  it("creates objective-mapped flashcards on demand", () => {
    const flashcards = buildMockFlashcards(objectives, chunks);

    expect(flashcards).toHaveLength(2);
    expect(flashcards[0].front).toContain("Describe repositories");
  });
});

describe("buildRemediationPacks", () => {
  it("builds cited remediation only for weak objectives", () => {
    const readiness = calculateReadiness(objectives, [
      { objectiveId: "obj-1", score: 1, maxScore: 1 },
      { objectiveId: "obj-2", score: 0, maxScore: 1 },
    ]);

    const packs = buildRemediationPacks(objectives, readiness.weakObjectives, chunks);

    expect(packs).toEqual([
      {
        objectiveId: "obj-2",
        summary: "You missed Actions: Describe workflows.",
        lesson:
          "Re-study the cited Microsoft Learn section, then explain the objective in your own words before looking back.",
        workedExample:
          "Example prompt: Given a real GitHub scenario, identify where Describe workflows applies and justify the next action.",
        citations: [
          {
            url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
            title: "Understanding GitHub Actions",
            headingPath: ["Understanding GitHub Actions", "Workflows"],
          },
        ],
      },
    ]);
  });
});
