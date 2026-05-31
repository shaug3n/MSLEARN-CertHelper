import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { SourceChunk } from "@/lib/types";

import { buildMockAssessment } from "./mock";
import { GeneratedAssessmentSchema, type GeneratedAssessment } from "./schemas";

export async function generateAssessment(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
): Promise<GeneratedAssessment> {
  if (!process.env.OPENAI_API_KEY) {
    return buildMockAssessment(objectives, chunks);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Generate Microsoft certification practice content. Every question and flashcard must map to one objectiveId and include at least one citation from the provided source chunks.",
        },
        {
          role: "user",
          content: JSON.stringify({
            objectives,
            sourceChunks: chunks.slice(0, 40),
            requiredQuestionTypes: [
              "multiple_choice",
              "short_answer",
              "code",
              "ordering",
            ],
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "generated_assessment",
          strict: true,
          schema: jsonSchema(),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI generation failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text =
    payload.output_text ??
    payload.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text;

  if (!text) {
    throw new Error("OpenAI response did not contain structured output text.");
  }

  return GeneratedAssessmentSchema.parse(JSON.parse(text));
}

function jsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["questions", "flashcards"],
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        items: {
          oneOf: [
            questionSchema("multiple_choice", {
              choices: { type: "array", minItems: 2, items: { type: "string" } },
              answer: { type: "string" },
            }),
            questionSchema("short_answer", {
              expectedAnswer: { type: "string" },
              rubric: { type: "string" },
            }),
            questionSchema("code", {
              expectedAnswer: { type: "string" },
              rubric: { type: "string" },
            }),
            questionSchema("ordering", {
              choices: { type: "array", minItems: 2, items: { type: "string" } },
              answer: { type: "array", minItems: 2, items: { type: "string" } },
            }),
          ],
        },
      },
      flashcards: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["objectiveId", "front", "back", "citations"],
          properties: {
            objectiveId: { type: "string" },
            front: { type: "string" },
            back: { type: "string" },
            citations: citationsSchema(),
          },
        },
      },
    },
  };
}

function questionSchema(type: string, extraProperties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["type", "objectiveId", "prompt", "citations", "difficulty", ...Object.keys(extraProperties)],
    properties: {
      type: { const: type },
      objectiveId: { type: "string" },
      prompt: { type: "string" },
      citations: citationsSchema(),
      difficulty: { enum: ["easy", "medium", "hard"] },
      ...extraProperties,
    },
  };
}

function citationsSchema() {
  return {
    type: "array",
    minItems: 1,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["url", "title", "headingPath"],
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        headingPath: { type: "array", minItems: 1, items: { type: "string" } },
      },
    },
  };
}
