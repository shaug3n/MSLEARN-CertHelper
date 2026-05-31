import { describe, expect, it } from "vitest";

import { buildOpenAiResponseSchema, normalizeOpenAiAssessment } from "./openai";

describe("buildOpenAiResponseSchema", () => {
  it("does not use unsupported composition keywords in question items", () => {
    const schemaJson = JSON.stringify(buildOpenAiResponseSchema());

    expect(schemaJson).not.toContain('"oneOf"');
    expect(schemaJson).not.toContain('"anyOf"');
    expect(schemaJson).not.toContain('"allOf"');
  });
});

describe("normalizeOpenAiAssessment", () => {
  it("normalizes flat OpenAI questions into app question variants", () => {
    const assessment = normalizeOpenAiAssessment({
      questions: [
        {
          type: "ordering",
          objectiveId: "obj-1",
          prompt: "Order the GitHub flow steps.",
          choices: ["Create branch", "Open pull request"],
          answer: "",
          orderedAnswer: ["Create branch", "Open pull request"],
          expectedAnswer: "",
          rubric: "",
          citations: [
            {
              url: "https://learn.microsoft.com/en-us/training/",
              title: "Microsoft Learn",
              headingPath: ["GitHub flow"],
            },
          ],
          difficulty: "medium",
        },
      ],
      flashcards: [
        {
          objectiveId: "obj-1",
          front: "What is GitHub flow?",
          back: "A branch and pull request collaboration workflow.",
          citations: [
            {
              url: "https://learn.microsoft.com/en-us/training/",
              title: "Microsoft Learn",
              headingPath: ["GitHub flow"],
            },
          ],
        },
      ],
    });

    expect(assessment.questions[0]).toEqual({
      type: "ordering",
      objectiveId: "obj-1",
      prompt: "Order the GitHub flow steps.",
      choices: ["Create branch", "Open pull request"],
      answer: ["Create branch", "Open pull request"],
      citations: [
        {
          url: "https://learn.microsoft.com/en-us/training/",
          title: "Microsoft Learn",
          headingPath: ["GitHub flow"],
        },
      ],
      difficulty: "medium",
    });
  });
});
