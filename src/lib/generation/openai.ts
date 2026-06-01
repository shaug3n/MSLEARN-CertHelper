import type { ObjectiveWithId } from "@/lib/analytics/readiness";
import type { SourceChunk } from "@/lib/types";
import { z } from "zod";

import { ASSESSMENT_QUESTION_COUNT, buildMockAssessment } from "./mock";
import {
  CitationSchema,
  GeneratedAssessmentSchema,
  type GeneratedAssessment,
} from "./schemas";

export { ASSESSMENT_QUESTION_COUNT } from "./mock";

export const OPENAI_ASSESSMENT_SYSTEM_PROMPT =
  "Generate Microsoft certification practice content. Create exactly 50 multiple-choice practice test questions. Every question must map to one objectiveId and include at least one citation from the provided source chunks. Each question must have four plausible answer choices, exactly one correct answer, and no true/false questions. Also create flashcards for spaced repetition.";
const MAX_SOURCE_CHUNKS_FOR_OPENAI = 16;
const MAX_SOURCE_CHUNK_CONTENT_LENGTH = 480;
const MAX_OPENAI_OUTPUT_TOKENS = 8000;
const OPENAI_REQUEST_TIMEOUT_MS = 90_000;

export async function generateAssessment(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
): Promise<GeneratedAssessment> {
  if (!process.env.OPENAI_API_KEY) {
    return buildMockAssessment(objectives, chunks);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(buildOpenAiRequestPayload(objectives, chunks)),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI generation timed out before the assessment could be created.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

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

export function buildOpenAiRequestPayload(
  objectives: ObjectiveWithId[],
  chunks: SourceChunk[],
) {
  return {
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    max_output_tokens: MAX_OPENAI_OUTPUT_TOKENS,
    input: [
      {
        role: "system",
        content: OPENAI_ASSESSMENT_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify({
          questionCount: ASSESSMENT_QUESTION_COUNT,
          objectives,
          sourceChunks: compactSourceChunks(chunks),
          requiredQuestionTypes: ["multiple_choice"],
          distribution:
            "Spread questions across all objectives. If there are fewer than 50 objectives, create multiple distinct questions per objective.",
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
  };
}

function compactSourceChunks(chunks: SourceChunk[]) {
  return chunks.slice(0, MAX_SOURCE_CHUNKS_FOR_OPENAI).map((chunk) => ({
    ...chunk,
    content: chunk.content.slice(0, MAX_SOURCE_CHUNK_CONTENT_LENGTH).trim(),
  }));
}

export function buildOpenAiResponseSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["questions", "flashcards"],
    properties: {
      questions: {
        type: "array",
        minItems: ASSESSMENT_QUESTION_COUNT,
        maxItems: ASSESSMENT_QUESTION_COUNT,
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
            type: { enum: ["multiple_choice"] },
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
  type: z.enum(["multiple_choice"]),
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
