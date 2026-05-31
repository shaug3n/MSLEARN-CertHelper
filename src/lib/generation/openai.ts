import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { SourceChunk } from "@/lib/types";
import { z } from "zod";

import { buildMockAssessment } from "./mock";
import {
  CitationSchema,
  GeneratedAssessmentSchema,
  type GeneratedAssessment,
} from "./schemas";

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
          schema: buildOpenAiResponseSchema(),
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

  return normalizeOpenAiAssessment(JSON.parse(text));
}

export function normalizeOpenAiAssessment(payload: unknown): GeneratedAssessment {
  const raw = OpenAiAssessmentSchema.parse(payload);
  return GeneratedAssessmentSchema.parse({
    questions: raw.questions.map((question) => {
      if (question.type === "multiple_choice") {
        return {
          type: question.type,
          objectiveId: question.objectiveId,
          prompt: question.prompt,
          choices: question.choices,
          answer: question.answer,
          citations: question.citations,
          difficulty: question.difficulty,
        };
      }

      if (question.type === "ordering") {
        return {
          type: question.type,
          objectiveId: question.objectiveId,
          prompt: question.prompt,
          choices: question.choices,
          answer: question.orderedAnswer,
          citations: question.citations,
          difficulty: question.difficulty,
        };
      }

      return {
        type: question.type,
        objectiveId: question.objectiveId,
        prompt: question.prompt,
        expectedAnswer: question.expectedAnswer,
        rubric: question.rubric,
        citations: question.citations,
        difficulty: question.difficulty,
      };
    }),
    flashcards: raw.flashcards,
  });
}

export function buildOpenAiResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["questions", "flashcards"],
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "type",
            "objectiveId",
            "prompt",
            "choices",
            "answer",
            "orderedAnswer",
            "expectedAnswer",
            "rubric",
            "citations",
            "difficulty",
          ],
          properties: {
            type: { enum: ["multiple_choice", "short_answer", "code", "ordering"] },
            objectiveId: { type: "string" },
            prompt: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
            answer: { type: "string" },
            orderedAnswer: { type: "array", items: { type: "string" } },
            expectedAnswer: { type: "string" },
            rubric: { type: "string" },
            citations: citationsSchema(),
            difficulty: { enum: ["easy", "medium", "hard"] },
          },
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

const OpenAiQuestionSchema = z.object({
  type: z.enum(["multiple_choice", "short_answer", "code", "ordering"]),
  objectiveId: z.string().min(1),
  prompt: z.string().min(1),
  choices: z.array(z.string()),
  answer: z.string(),
  orderedAnswer: z.array(z.string()),
  expectedAnswer: z.string(),
  rubric: z.string(),
  citations: z.array(CitationSchema).min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const OpenAiAssessmentSchema = z.object({
  questions: z.array(OpenAiQuestionSchema).min(1),
  flashcards: GeneratedAssessmentSchema.shape.flashcards,
});
