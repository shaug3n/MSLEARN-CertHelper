import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_QUESTION_COUNT,
  OPENAI_ASSESSMENT_SYSTEM_PROMPT,
  buildOpenAiRequestPayload,
  buildOpenAiResponseSchema,
  normalizeOpenAiAssessment,
} from "./openai";

describe("buildOpenAiResponseSchema", () => {
  it("does not use unsupported composition keywords in question items", () => {
    const schemaJson = JSON.stringify(buildOpenAiResponseSchema());

    expect(schemaJson).not.toContain('"oneOf"');
    expect(schemaJson).not.toContain('"anyOf"');
    expect(schemaJson).not.toContain('"allOf"');
  });

  it("restricts generated assessment questions to multiple choice", () => {
    const questions = buildOpenAiResponseSchema().properties.questions;

    expect(questions.minItems).toBe(ASSESSMENT_QUESTION_COUNT);
    expect(questions.maxItems).toBe(ASSESSMENT_QUESTION_COUNT);
    expect(questions.items.properties.type).toEqual({ enum: ["multiple_choice"] });
  });
});

describe("buildOpenAiRequestPayload", () => {
  it("stores the assessment prompt and requests exactly 50 multiple-choice questions", () => {
    const payload = buildOpenAiRequestPayload([], []);

    expect(OPENAI_ASSESSMENT_SYSTEM_PROMPT).toContain("multiple-choice");
    expect(payload.input[1].content).toContain(`"questionCount":${ASSESSMENT_QUESTION_COUNT}`);
    expect(payload.input[1].content).toContain('"requiredQuestionTypes":["multiple_choice"]');
  });

  it("compacts source chunks to reduce hosted inference latency", () => {
    const payload = buildOpenAiRequestPayload(
      [{ id: "obj-1", domain: "Actions", objective: "Describe workflows" }],
      Array.from({ length: 25 }).map((_, index) => ({
        url: `https://learn.microsoft.com/${index}`,
        title: `Doc ${index}`,
        headingPath: ["Actions", `Heading ${index}`],
        content: "A".repeat(900),
      })),
    );

    const userInput = payload.input[1].content;

    expect(payload.max_output_tokens).toBe(8000);
    expect(userInput).toContain('"sourceChunks"');
    expect(userInput).not.toContain("A".repeat(900));
    expect(userInput).toContain("A".repeat(480));
    expect(userInput).not.toContain('"url":"https://learn.microsoft.com/24"');
  });
});

describe("normalizeOpenAiAssessment", () => {
  it("normalizes flat OpenAI questions into app question variants", () => {
    const assessment = normalizeOpenAiAssessment({
      questions: [
        {
          type: "multiple_choice",
          objectiveId: "obj-1",
          prompt: "What is GitHub flow?",
          choices: ["A branch and pull request workflow", "A billing dashboard"],
          answer: "A branch and pull request workflow",
          orderedAnswer: [],
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
      type: "multiple_choice",
      objectiveId: "obj-1",
      prompt: "What is GitHub flow?",
      choices: ["A branch and pull request workflow", "A billing dashboard"],
      answer: "A branch and pull request workflow",
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
