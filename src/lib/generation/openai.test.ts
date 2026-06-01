import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ASSESSMENT_QUESTION_COUNT,
  OPENAI_ASSESSMENT_SYSTEM_PROMPT,
  OPENAI_FLASHCARDS_SYSTEM_PROMPT,
  buildOpenAiRequestPayload,
  buildOpenAiFlashcardRequestPayload,
  generateAssessment,
  buildOpenAiResponseSchema,
  normalizeOpenAiAssessment,
} from "./openai";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
});

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
    expect(OPENAI_ASSESSMENT_SYSTEM_PROMPT).not.toContain("flashcards");
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
    expect(userInput).toContain('"id":"chunk-1"');
    expect(userInput).not.toContain("A".repeat(900));
    expect(userInput).toContain("A".repeat(480));
    expect(userInput).not.toContain('"url":"https://learn.microsoft.com/24"');
  });

  it("selects ranked source chunks before building the OpenAI payload", () => {
    const payload = buildOpenAiRequestPayload(
      [
        {
          id: "obj-actions",
          domain: "Automation and AI tools",
          objective: "Describe GitHub Actions workflows",
        },
      ],
      [
        {
          url: "https://learn.microsoft.com/en-us/training/modules/github-codespaces/",
          title: "GitHub Codespaces",
          headingPath: ["Codespaces"],
          content: "Codespaces creates cloud-hosted development environments.",
        },
        {
          url: "https://docs.github.com/en/actions",
          title: "GitHub Actions",
          headingPath: ["GitHub Actions", "Workflows"],
          content: "GitHub Actions workflows automate build, test, and deployment.",
        },
      ],
    );

    const sourceChunks = JSON.parse(payload.input[1].content).sourceChunks;

    expect(sourceChunks[0].url).toBe("https://docs.github.com/en/actions");
  });

  it("builds a separate flashcard payload for on-demand study generation", () => {
    const payload = buildOpenAiFlashcardRequestPayload(
      [{ id: "obj-1", domain: "Actions", objective: "Describe workflows" }],
      [
        {
          url: "https://learn.microsoft.com/en-us/actions",
          title: "GitHub Actions",
          headingPath: ["Workflows"],
          content: "A workflow is a configurable automated process.",
        },
      ],
    );

    expect(OPENAI_FLASHCARDS_SYSTEM_PROMPT).toContain("flashcards");
    expect(payload.input[1].content).toContain('"objectiveCount":1');
  });
});

describe("normalizeOpenAiAssessment", () => {
  it("normalizes source chunk references into stored citations without flashcards", () => {
    const assessment = normalizeOpenAiAssessment(
      {
        questions: [
          {
            type: "multiple_choice",
            objectiveId: "obj-1",
            prompt: "What is GitHub flow?",
            choices: ["A branch and pull request workflow", "A billing dashboard"],
            answer: "A branch and pull request workflow",
            sourceChunkIds: ["chunk-2"],
            difficulty: "medium",
          },
        ],
      },
      [
        {
          id: "chunk-1",
          url: "https://learn.microsoft.com/en-us/training/",
          title: "Microsoft Learn",
          headingPath: ["Ignored"],
          content: "",
        },
        {
          id: "chunk-2",
          url: "https://learn.microsoft.com/en-us/training/modules/github-flow/",
          title: "GitHub flow",
          headingPath: ["GitHub flow"],
          content: "",
        },
      ],
    );

    expect(assessment.questions[0]).toEqual({
      type: "multiple_choice",
      objectiveId: "obj-1",
      prompt: "What is GitHub flow?",
      choices: ["A branch and pull request workflow", "A billing dashboard"],
      answer: "A branch and pull request workflow",
      citations: [
        {
          url: "https://learn.microsoft.com/en-us/training/modules/github-flow/",
          title: "GitHub flow",
          headingPath: ["GitHub flow"],
        },
      ],
      difficulty: "medium",
    });
    expect(assessment.flashcards).toEqual([]);
  });

  it("drops questions that reference unknown objectives and keeps valid generated questions", () => {
    const assessment = normalizeOpenAiAssessment(
      {
        questions: [
          {
            type: "multiple_choice",
            objectiveId: "obj-1",
            prompt: "Valid question",
            choices: ["A", "B", "C", "D"],
            answer: "A",
            sourceChunkIds: ["chunk-1"],
            difficulty: "medium",
          },
          {
            type: "multiple_choice",
            objectiveId: "unknown-objective",
            prompt: "Invalid question",
            choices: ["A", "B", "C", "D"],
            answer: "A",
            sourceChunkIds: ["chunk-1"],
            difficulty: "medium",
          },
        ],
      },
      [
        {
          id: "chunk-1",
          url: "https://learn.microsoft.com/en-us/training/",
          title: "Microsoft Learn",
          headingPath: ["Learn"],
          content: "",
        },
      ],
      new Set(["obj-1"]),
    );

    expect(assessment.questions).toHaveLength(1);
    expect(assessment.questions[0].prompt).toBe("Valid question");
  });
});

describe("generateAssessment", () => {
  it("falls back to deterministic generation when OpenAI times out", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" })),
    );

    const assessment = await generateAssessment(
      [{ id: "obj-1", domain: "Actions", objective: "Describe workflows" }],
      [
        {
          url: "https://learn.microsoft.com/en-us/actions",
          title: "GitHub Actions",
          headingPath: ["Workflows"],
          content: "A workflow is a configurable automated process.",
        },
      ],
    );

    expect(assessment.questions).toHaveLength(ASSESSMENT_QUESTION_COUNT);
    expect(assessment.questions[0].type).toBe("multiple_choice");
  });

  it("still throws configuration errors such as unauthorized API keys", async () => {
    process.env.OPENAI_API_KEY = "bad-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      generateAssessment(
        [{ id: "obj-1", domain: "Actions", objective: "Describe workflows" }],
        [
          {
            url: "https://learn.microsoft.com/en-us/actions",
            title: "GitHub Actions",
            headingPath: ["Workflows"],
            content: "A workflow is a configurable automated process.",
          },
        ],
      ),
    ).rejects.toThrow("OpenAI generation failed: 401");
  });

  it("uses real OpenAI output instead of fallback when the model returns source chunk ids", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: JSON.stringify({
                      questions: Array.from({ length: ASSESSMENT_QUESTION_COUNT }).map(
                        (_, index) => ({
                          type: "multiple_choice",
                          objectiveId: "obj-1",
                          prompt: `Generated question ${index + 1}`,
                          choices: ["A", "B", "C", "D"],
                          answer: "B",
                          sourceChunkIds: ["chunk-1"],
                          difficulty: "medium",
                        }),
                      ),
                    }),
                  },
                ],
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const assessment = await generateAssessment(
      [{ id: "obj-1", domain: "Actions", objective: "Describe workflows" }],
      [
        {
          url: "https://learn.microsoft.com/en-us/actions",
          title: "GitHub Actions",
          headingPath: ["Workflows"],
          content: "A workflow is a configurable automated process.",
        },
      ],
    );

    expect(assessment.questions[0].prompt).toBe("Generated question 1");
    expect(assessment.questions[0].type).toBe("multiple_choice");
    if (assessment.questions[0].type !== "multiple_choice") {
      throw new Error("Expected a multiple-choice question");
    }
    expect(assessment.questions[0].answer).toBe("B");
    expect(assessment.questions[0].citations).toEqual([
      {
        url: "https://learn.microsoft.com/en-us/actions",
        title: "GitHub Actions",
        headingPath: ["Workflows"],
      },
    ]);
  });

  it("tops up invalid OpenAI objective references with deterministic questions", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              questions: Array.from({ length: ASSESSMENT_QUESTION_COUNT }).map((_, index) => ({
                type: "multiple_choice",
                objectiveId: index === 0 ? "obj-1" : "wrong-md102-objective",
                prompt: `Generated question ${index + 1}`,
                choices: ["A", "B", "C", "D"],
                answer: "A",
                sourceChunkIds: ["chunk-1"],
                difficulty: "medium",
              })),
            }),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const assessment = await generateAssessment(
      [{ id: "obj-1", domain: "Endpoint", objective: "Manage devices" }],
      [
        {
          url: "https://learn.microsoft.com/en-us/mem/",
          title: "Microsoft Intune",
          headingPath: ["Devices"],
          content: "Manage devices with Microsoft Intune.",
        },
      ],
    );

    expect(assessment.questions).toHaveLength(ASSESSMENT_QUESTION_COUNT);
    expect(assessment.questions.every((question) => question.objectiveId === "obj-1")).toBe(true);
    expect(assessment.questions[0].prompt).toBe("Generated question 1");
  });
});
