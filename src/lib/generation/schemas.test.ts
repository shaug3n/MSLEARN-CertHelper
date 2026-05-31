import { describe, expect, it } from "vitest";

import { GeneratedAssessmentSchema } from "./schemas";

describe("GeneratedAssessmentSchema", () => {
  it("requires objective mappings and citations for generated content", () => {
    const parsed = GeneratedAssessmentSchema.safeParse({
      questions: [
        {
          type: "short_answer",
          objectiveId: "obj-1",
          prompt: "Explain what a GitHub Actions workflow is.",
          expectedAnswer:
            "A configurable automated process made of one or more jobs.",
          rubric: "Award full credit for process, automation, and jobs.",
          citations: [
            {
              url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
              title: "Understanding GitHub Actions",
              headingPath: ["Understanding GitHub Actions", "Workflows"],
            },
          ],
          difficulty: "medium",
        },
      ],
      flashcards: [
        {
          objectiveId: "obj-1",
          front: "What is a GitHub Actions workflow?",
          back: "A configurable automated process that runs one or more jobs.",
          citations: [
            {
              url: "https://learn.microsoft.com/en-us/actions/learn-github-actions/understanding-github-actions",
              title: "Understanding GitHub Actions",
              headingPath: ["Understanding GitHub Actions", "Workflows"],
            },
          ],
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects uncited questions", () => {
    const parsed = GeneratedAssessmentSchema.safeParse({
      questions: [
        {
          type: "multiple_choice",
          objectiveId: "obj-1",
          prompt: "What is a workflow?",
          choices: ["A repository", "An automated process"],
          answer: "An automated process",
          citations: [],
          difficulty: "easy",
        },
      ],
      flashcards: [],
    });

    expect(parsed.success).toBe(false);
  });
});
